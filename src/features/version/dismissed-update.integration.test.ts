import { env } from "cloudflare:workers";
import {
  createMockAdminSession,
  createMockExecutionCtx,
  seedAdminApiKey,
  seedUser,
} from "tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { serializeKey } from "@/features/cache/serialize";
import { DISMISSED_UPDATE_KEY } from "@/features/version/update-check.schema";
import { VERSION_CACHE_KEYS } from "@/features/version/version.schema";
import { getAuth } from "@/lib/auth/auth.server";
import { getDb } from "@/lib/db";
import { createApiContext } from "@/lib/orpc/create-context";
import { handleApiRequest } from "@/lib/orpc/openapi-handler";

// Silencing the update notice, through the real routes: an Admin signed in
// through the browser dismisses the latest version and restores the reminder;
// an API Key cannot. The check answers from a cached release, so no request
// leaves the test.

const db = getDb(env);
const DISMISSED = serializeKey(DISMISSED_UPDATE_KEY);
const CACHE = serializeKey(VERSION_CACHE_KEYS.latestRelease);
const CHECK = "/admin/version";
const DISMISS = "/admin/version/dismissed";
const LATEST = "v99.0.0";

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

async function call(
  path: string,
  method: string,
  headers: Record<string, string>,
  body?: unknown,
) {
  const request = new Request(`http://localhost:3000/api${path}`, {
    method,
    headers:
      body === undefined
        ? headers
        : { ...headers, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handleApiRequest(
    request,
    createApiContext(request.headers, env, createMockExecutionCtx()),
  );
}

async function dismissed(cookie: string) {
  const response = await call(CHECK, "GET", { cookie });
  expect(response.status).toBe(200);
  const answer = (await response.json()) as {
    latestVersion: string;
    hasUpdate: boolean;
    dismissed: boolean;
  };
  expect(answer.latestVersion).toBe(LATEST);
  expect(answer.hasUpdate).toBe(true);
  return answer.dismissed;
}

const dismiss = (cookie: string, version: string | null) =>
  call(DISMISS, "POST", { cookie }, { version });

let cookie: string;
beforeEach(async () => {
  await env.KV.delete(DISMISSED);
  // A cached answer: the latest release, with the notes since the running version.
  await env.KV.put(
    CACHE,
    JSON.stringify({
      latestVersion: LATEST,
      releaseUrl: `https://github.com/du2333/flare-stack-blog/releases/tag/${LATEST}`,
      notesAvailable: true,
      notesSince: __APP_VERSION__,
      entries: [{ version: "99.0.0", summary: "A major step." }],
    }),
  );
  cookie = await signIn();
});

describe("silencing the update notice", () => {
  it("dismisses the latest version, for every browser, and restores it", async () => {
    expect(await dismissed(cookie)).toBe(false);

    const response = await dismiss(cookie, LATEST);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(await env.KV.get(DISMISSED)).toBe(LATEST);
    expect(await dismissed(cookie)).toBe(true);

    // Another browser session of the same Admin reads the same.
    expect(await dismissed(await signIn())).toBe(true);

    const restored = await dismiss(cookie, null);
    expect(restored.status).toBe(200);
    expect(await env.KV.get(DISMISSED)).toBeNull();
    expect(await dismissed(cookie)).toBe(false);
  });

  it("comes back whole when a newer version is the latest", async () => {
    await env.KV.put(DISMISSED, "v98.0.0");
    expect(await dismissed(cookie)).toBe(false);
  });

  it("refuses a version that is not the latest and records nothing", async () => {
    for (const version of ["v98.0.0", "v100.0.0", "not a version"]) {
      const response = await dismiss(cookie, version);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(await env.KV.get(DISMISSED)).toBeNull();
    }
    expect((await dismiss(cookie, "v98.0.0")).status).toBe(409);
  });

  it("reads a stored value that is not a version as not dismissed", async () => {
    await env.KV.put(DISMISSED, "garbage");
    expect(await dismissed(cookie)).toBe(false);
  });

  it("refuses an API Key and leaves the record alone", async () => {
    const apiKey = await seedAdminApiKey();
    await env.KV.put(DISMISSED, LATEST);

    const dismissWithKey = await call(
      DISMISS,
      "POST",
      { "x-api-key": apiKey },
      { version: null },
    );
    expect(dismissWithKey.status).toBe(403);
    expect(await env.KV.get(DISMISSED)).toBe(LATEST);

    // The check itself stays open to a key, and reports the record.
    const check = await call(CHECK, "GET", { "x-api-key": apiKey });
    expect(check.status).toBe(200);
  });

  it("refuses a request with no session", async () => {
    expect((await call(DISMISS, "POST", {}, { version: LATEST })).status).toBe(
      401,
    );
    expect(await env.KV.get(DISMISSED)).toBeNull();
  });

  it("stays out of the public API document", async () => {
    const response = await call("/spec.json", "GET", {});
    const doc = (await response.json()) as { paths: Record<string, unknown> };
    expect(doc.paths[DISMISS]).toBeUndefined();
    expect(doc.paths[CHECK]).toBeDefined();
  });
});
