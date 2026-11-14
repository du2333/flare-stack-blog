import { env } from "cloudflare:workers";
import {
  createMockAdminSession,
  createMockExecutionCtx,
  seedAdminApiKey,
  seedUser,
} from "tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { serializeKey } from "@/features/cache/serialize";
import { ACKNOWLEDGED_VERSION_KEY } from "@/features/version/upgrade-notice.schema";
import { getAuth } from "@/lib/auth/auth.server";
import { getDb } from "@/lib/db";
import { createApiContext } from "@/lib/orpc/create-context";
import { handleApiRequest } from "@/lib/orpc/openapi-handler";

// The notice after an upgrade, through the real routes: an Admin signed in
// through the browser reads it and acknowledges it; an API Key cannot.

const db = getDb(env);
const KEY = serializeKey(ACKNOWLEDGED_VERSION_KEY);
const NOTICE = "/admin/version/upgrade-notice";
const ACKNOWLEDGE = "/admin/version/upgrade-notice/acknowledge";

/** Signs the Admin in with a Sign-in Code and returns their Cookie header. */
async function signIn() {
  const admin = createMockAdminSession().user;
  await seedUser(db, admin);
  const queueSend = vi.spyOn(env.QUEUE, "send").mockResolvedValue({
    metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
  });
  const auth = getAuth({ db, env });
  await auth.api.sendVerificationOTP({
    body: { email: admin.email, type: "sign-in" },
  });
  const message = queueSend.mock.calls.at(-1)?.[0] as {
    data: { html: string };
  };
  const otp = /letter-spacing:8px[^>]*>(\d{6})</.exec(message.data.html)?.[1];
  if (!otp) throw new Error("No Sign-in Code in the queued email");
  const { headers } = await auth.api.signInEmailOTP({
    body: { email: admin.email, otp },
    returnHeaders: true,
  });
  return headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

async function call(path: string, method: string, headers: HeadersInit) {
  const request = new Request(`http://localhost:3000/api${path}`, {
    method,
    headers,
  });
  return handleApiRequest(
    request,
    createApiContext(request.headers, env, createMockExecutionCtx()),
  );
}

type Notice = {
  version: string;
  entries: Array<{
    version: string;
    summary: string;
    after?: Array<{ id: string; text: string }>;
  }>;
} | null;

async function read(cookie: string) {
  const response = await call(NOTICE, "GET", { cookie });
  expect(response.status).toBe(200);
  return ((await response.json()) as { notice: Notice }).notice;
}

async function acknowledge(cookie: string) {
  const response = await call(ACKNOWLEDGE, "POST", { cookie });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true });
}

let cookie: string;
beforeEach(async () => {
  await env.KV.delete(KEY);
  cookie = await signIn();
});

describe("the notice after an upgrade", () => {
  it("records the running version on the first read and shows nothing", async () => {
    expect(await env.KV.get(KEY)).toBeNull();
    expect(await read(cookie)).toBeNull();
    expect(await env.KV.get(KEY)).toBe(__APP_VERSION__);
    // Still nothing on the next read.
    expect(await read(cookie)).toBeNull();
  });

  it("shows the notice once the record is older, until it is acknowledged", async () => {
    await env.KV.put(KEY, "3.0.0");

    const notice = await read(cookie);
    expect(notice?.version).toBe(__APP_VERSION__);
    expect(notice?.entries.length).toBeGreaterThan(0);
    expect(notice?.entries.at(-1)?.version).toBe(__APP_VERSION__);
    // Reading does not acknowledge.
    expect(await env.KV.get(KEY)).toBe("3.0.0");
    expect(await read(cookie)).not.toBeNull();

    await acknowledge(cookie);
    expect(await env.KV.get(KEY)).toBe(__APP_VERSION__);
    expect(await read(cookie)).toBeNull();
  });

  it("is gone for every browser once acknowledged", async () => {
    await env.KV.put(KEY, "3.0.0");
    await acknowledge(cookie);
    // Another browser session of the same Admin.
    const other = await signIn();
    expect(await read(other)).toBeNull();
  });

  it("shows nothing and keeps the record after a rollback", async () => {
    await env.KV.put(KEY, "99.0.0");
    expect(await read(cookie)).toBeNull();
    await acknowledge(cookie);
    expect(await env.KV.get(KEY)).toBe("99.0.0");
  });

  it("reads a stored value that is not a version as no record", async () => {
    await env.KV.put(KEY, "garbage");
    expect(await read(cookie)).toBeNull();
    expect(await env.KV.get(KEY)).toBe(__APP_VERSION__);
  });

  it("refuses an API Key for both operations and leaves the record alone", async () => {
    const apiKey = await seedAdminApiKey();
    await env.KV.put(KEY, "3.0.0");

    const get = await call(NOTICE, "GET", { "x-api-key": apiKey });
    const post = await call(ACKNOWLEDGE, "POST", { "x-api-key": apiKey });
    expect(get.status).toBe(403);
    expect(post.status).toBe(403);
    expect(await env.KV.get(KEY)).toBe("3.0.0");
  });

  it("refuses a request with no session", async () => {
    expect((await call(NOTICE, "GET", {})).status).toBe(401);
    expect((await call(ACKNOWLEDGE, "POST", {})).status).toBe(401);
  });

  it("stays out of the public API document", async () => {
    const response = await call("/spec.json", "GET", {});
    const doc = (await response.json()) as { paths: Record<string, unknown> };
    expect(doc.paths[NOTICE]).toBeUndefined();
    expect(doc.paths[ACKNOWLEDGE]).toBeUndefined();
  });
});
