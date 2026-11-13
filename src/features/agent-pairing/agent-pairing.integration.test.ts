import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import {
  createMockAdminSession,
  createMockExecutionCtx,
  seedAdminApiKey,
  seedUser,
} from "tests/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isPairedApiKey } from "@/features/agent-pairing/agent-pairing.schema";
import { getAuth } from "@/lib/auth/auth.server";
import { getDb } from "@/lib/db";
import { apikey, PairingCodesTable } from "@/lib/db/schema";
import { createApiContext } from "@/lib/orpc/create-context";
import { handleApiRequest } from "@/lib/orpc/openapi-handler";

// An Admin generates a Pairing Code in the admin UI (a browser session); an
// agent exchanges it, with no key, for an API Key owned by that Admin.

const db = getDb(env);

/** Signs a User in with a Sign-in Code and returns their Cookie header. */
async function signIn(options: { id: string; role: "admin" | null }) {
  const email = `${options.id}@example.com`;
  await seedUser(db, {
    ...createMockAdminSession().user,
    id: options.id,
    email,
    role: options.role,
  });
  const queueSend = vi.spyOn(env.QUEUE, "send").mockResolvedValue({
    metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
  });
  const auth = getAuth({ db, env });
  await auth.api.sendVerificationOTP({ body: { email, type: "sign-in" } });
  const message = queueSend.mock.calls.at(-1)?.[0] as {
    data: { html: string };
  };
  const otp = /letter-spacing:8px[^>]*>(\d{6})</.exec(message.data.html)?.[1];
  if (!otp) throw new Error("No Sign-in Code in the queued email");
  const { headers } = await auth.api.signInEmailOTP({
    body: { email, otp },
    returnHeaders: true,
  });
  return headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

async function call(
  path: string,
  init: { method?: string; headers?: HeadersInit; body?: unknown } = {},
) {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  const request = new Request(`http://localhost:3000/api${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  return handleApiRequest(
    request,
    createApiContext(request.headers, env, createMockExecutionCtx()),
  );
}

async function generate(cookie: string) {
  const response = await call("/admin/pairing-code", {
    method: "POST",
    headers: { cookie },
  });
  expect(response.status).toBe(200);
  return (await response.json()) as { code: string; expiresAt: string };
}

async function status(cookie: string) {
  const response = await call("/admin/pairing-code", { headers: { cookie } });
  expect(response.status).toBe(200);
  return (await response.json()) as {
    state: string;
    expiresAt?: string;
    agent?: { name: string; apiKeyId: string; connectedAt: string };
  };
}

function exchange(
  code: string,
  agentName = "Claude Code",
  ip = "198.51.100.1",
) {
  return call("/pairing", {
    method: "POST",
    headers: { "cf-connecting-ip": ip },
    body: { code, agentName },
  });
}

describe("generating a Pairing Code", () => {
  it("answers an eight-character code that lives ten minutes and waits for an agent", async () => {
    const cookie = await signIn({ id: "pair-gen", role: "admin" });
    expect(await status(cookie)).toEqual({ state: "none" });

    const before = Date.now();
    const { code, expiresAt } = await generate(cookie);
    const after = Date.now();

    expect(code).toMatch(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    // The server stamps the code somewhere between the two clock readings and
    // stores the expiry in whole seconds (rounded down), so it falls between
    // the earliest and the latest such instant plus ten minutes.
    const tenMinutes = 10 * 60 * 1000;
    const wholeSecond = (ms: number) => Math.floor(ms / 1000) * 1000;
    const expires = new Date(expiresAt).getTime();
    expect(expires).toBeGreaterThanOrEqual(wholeSecond(before + tenMinutes));
    expect(expires).toBeLessThanOrEqual(after + tenMinutes);
    expect(await status(cookie)).toEqual({ state: "waiting", expiresAt });
  });

  it("stores only the code's hash", async () => {
    const cookie = await signIn({ id: "pair-hash", role: "admin" });
    const { code } = await generate(cookie);

    const row = await db.query.PairingCodesTable.findFirst({
      where: eq(PairingCodesTable.userId, "pair-hash"),
    });
    expect(row?.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain(code.replace("-", ""));
  });

  it("makes the Admin's previous code stop working", async () => {
    const cookie = await signIn({ id: "pair-regen", role: "admin" });
    const first = await generate(cookie);
    const second = await generate(cookie);

    expect((await exchange(first.code)).status).toBe(404);
    expect((await exchange(second.code)).status).toBe(200);
  });

  it("gives each Admin a code of their own", async () => {
    const one = await signIn({ id: "pair-admin-one", role: "admin" });
    const two = await signIn({ id: "pair-admin-two", role: "admin" });
    const { code } = await generate(one);
    await generate(two);

    expect((await exchange(code)).status).toBe(200);
    expect((await status(one)).state).toBe("connected");
    expect((await status(two)).state).toBe("waiting");
  });
});

describe("generating a code another Admin's live code equals", () => {
  const realGetRandomValues = crypto.getRandomValues.bind(crypto);

  /** Makes the next `count` Pairing Codes drawn all `2222-2222`. */
  function drawSameCode(count: number) {
    let left = count;
    return vi
      .spyOn(crypto, "getRandomValues")
      .mockImplementation(((array: Uint8Array<ArrayBuffer>) =>
        array.length === 8 && left-- > 0
          ? array.fill(0)
          : realGetRandomValues(array)) as typeof crypto.getRandomValues);
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("draws another code instead of failing on the unique index", async () => {
    const one = await signIn({ id: "pair-clash-one", role: "admin" });
    const two = await signIn({ id: "pair-clash-two", role: "admin" });

    drawSameCode(1);
    const first = await generate(one);
    expect(first.code).toBe("2222-2222");
    drawSameCode(1);
    const second = await generate(two);
    vi.restoreAllMocks();

    expect(second.code).not.toBe(first.code);
    expect((await exchange(first.code, "Agent One")).status).toBe(200);
    expect((await exchange(second.code, "Agent Two")).status).toBe(200);
    expect((await status(one)).agent?.name).toBe("Agent One");
    expect((await status(two)).agent?.name).toBe("Agent Two");
  });

  it("gives up with an error after a few clashes, leaving the other Admin's code alone", async () => {
    const one = await signIn({ id: "pair-clash-held", role: "admin" });
    const two = await signIn({ id: "pair-clash-lost", role: "admin" });

    drawSameCode(1);
    const first = await generate(one);
    vi.restoreAllMocks();

    drawSameCode(Infinity);
    const response = await call("/admin/pairing-code", {
      method: "POST",
      headers: { cookie: two },
    });
    vi.restoreAllMocks();

    expect(response.status).toBe(500);
    expect((await status(two)).state).toBe("none");
    expect((await exchange(first.code)).status).toBe(200);
  });
});

describe("cancelling and expiry", () => {
  it("cancels the current code", async () => {
    const cookie = await signIn({ id: "pair-cancel", role: "admin" });
    const { code, expiresAt } = await generate(cookie);

    const response = await call("/admin/pairing-code", {
      method: "DELETE",
      headers: { cookie },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(await status(cookie)).toEqual({ state: "cancelled", expiresAt });
    expect((await exchange(code)).status).toBe(404);
  });

  it("leaves an exchanged code connected when cancelled", async () => {
    const cookie = await signIn({ id: "pair-cancel-late", role: "admin" });
    const { code } = await generate(cookie);
    expect((await exchange(code)).status).toBe(200);

    await call("/admin/pairing-code", {
      method: "DELETE",
      headers: { cookie },
    });
    expect((await status(cookie)).state).toBe("connected");
  });

  it("refuses a code past its ten minutes", async () => {
    const cookie = await signIn({ id: "pair-expired", role: "admin" });
    const { code } = await generate(cookie);
    await db
      .update(PairingCodesTable)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(PairingCodesTable.userId, "pair-expired"));

    expect((await status(cookie)).state).toBe("expired");
    expect((await exchange(code)).status).toBe(404);
    expect((await status(cookie)).state).toBe("expired");
  });
});

describe("exchanging a Pairing Code", () => {
  it("creates an API Key for the Admin, named after the agent and marked as paired", async () => {
    const cookie = await signIn({ id: "pair-owner", role: "admin" });
    const { code } = await generate(cookie);

    const response = await exchange(code, "  Claude Code  ");
    expect(response.status).toBe(200);
    const body = (await response.json()) as { apiKey: string; url: string };
    expect(Object.keys(body).sort()).toEqual(["apiKey", "url"]);
    expect(body.apiKey).toMatch(/^fsb_/);
    expect(body.url).toBe("https://example.com");

    const { agent } = await status(cookie);
    expect(agent?.name).toBe("Claude Code");
    const key = await db.query.apikey.findFirst({
      where: eq(apikey.id, agent!.apiKeyId),
    });
    const today = new Date().toISOString().slice(0, 10);
    expect(key).toMatchObject({
      referenceId: "pair-owner",
      name: `Claude Code · ${today}`,
      expiresAt: null,
      enabled: true,
    });
    expect(new Date(agent!.connectedAt).getTime()).toBeLessThanOrEqual(
      Date.now(),
    );

    // The admin UI's API Key list tells the paired keys apart by metadata.
    const auth = getAuth({ db, env });
    const { apiKeys } = await auth.api.listApiKeys({
      headers: new Headers({ cookie }),
    });
    const listed = apiKeys.find((item) => item.id === agent!.apiKeyId);
    expect(listed?.metadata).toEqual({
      source: "pairing",
      agentName: "Claude Code",
    });
    expect(isPairedApiKey(listed?.metadata)).toBe(true);
  });

  it("answers a key that acts as the Admin", async () => {
    const cookie = await signIn({ id: "pair-acts", role: "admin" });
    const { code } = await generate(cookie);
    const { apiKey } = (await (await exchange(code)).json()) as {
      apiKey: string;
    };

    const posts = await call("/admin/posts", {
      headers: { "x-api-key": apiKey },
    });
    expect(posts.status).toBe(200);
  });

  it("works once", async () => {
    const cookie = await signIn({ id: "pair-once", role: "admin" });
    const { code } = await generate(cookie);

    expect((await exchange(code)).status).toBe(200);
    const again = await exchange(code, "Another Agent");
    expect(again.status).toBe(404);
    expect((await status(cookie)).agent?.name).toBe("Claude Code");
  });

  it("gives one of several simultaneous exchanges of a code the key", async () => {
    const cookie = await signIn({ id: "pair-race", role: "admin" });
    const { code } = await generate(cookie);

    const responses = await Promise.all(
      Array.from({ length: 5 }, (_, n) =>
        exchange(code, `Agent ${n}`, `198.51.100.${10 + n}`),
      ),
    );
    expect(responses.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      200, 404, 404, 404, 404,
    ]);
    const keys = await db.query.apikey.findMany({
      where: eq(apikey.referenceId, "pair-race"),
    });
    expect(keys).toHaveLength(1);
  });

  it("reads the code without case, hyphen or spaces", async () => {
    const cookie = await signIn({ id: "pair-case", role: "admin" });
    const { code } = await generate(cookie);

    const typed = ` ${code.replace("-", "").toLowerCase()} `;
    expect((await exchange(typed)).status).toBe(200);
  });

  it("keeps an earlier key when the same agent pairs again", async () => {
    const cookie = await signIn({ id: "pair-twice", role: "admin" });
    expect((await exchange((await generate(cookie)).code)).status).toBe(200);
    expect((await exchange((await generate(cookie)).code)).status).toBe(200);

    const keys = await db.query.apikey.findMany({
      where: eq(apikey.referenceId, "pair-twice"),
    });
    expect(keys).toHaveLength(2);
  });

  it("answers the same 404 for a wrong, malformed, used or cancelled code", async () => {
    const cookie = await signIn({ id: "pair-404", role: "admin" });
    const used = (await generate(cookie)).code;
    expect((await exchange(used)).status).toBe(200);
    const cancelled = (await generate(cookie)).code;
    await call("/admin/pairing-code", {
      method: "DELETE",
      headers: { cookie },
    });

    const bodies = [];
    for (const [n, code] of [
      "ZZZZ-ZZZZ",
      "not a code",
      "",
      used,
      cancelled,
    ].entries()) {
      const response = await exchange(code, "Claude Code", `198.51.100.${n}`);
      expect(response.status, code).toBe(404);
      bodies.push(await response.json());
    }
    for (const body of bodies) {
      expect(body).toEqual(bodies[0]);
    }
    expect(bodies[0]).toMatchObject({
      code: "PAIRING_CODE_NOT_FOUND",
      defined: true,
    });
  });

  it("answers 400 for an agent name a Tag could not have, using no code", async () => {
    const cookie = await signIn({ id: "pair-400", role: "admin" });
    const { code } = await generate(cookie);

    for (const agentName of ["", "   ", "a".repeat(51), "Claude​Code"]) {
      const response = await exchange(code, agentName);
      expect(response.status, agentName).toBe(400);
    }
    const unknownField = await call("/pairing", {
      method: "POST",
      body: { code, agentName: "Claude Code", expiresIn: 60 },
    });
    expect(unknownField.status).toBe(400);
    expect((await status(cookie)).state).toBe("waiting");
  });

  it("limits each IP address to 10 exchanges a minute", async () => {
    for (let n = 0; n < 10; n++) {
      expect(
        (await exchange("ZZZZ-ZZZZ", "Agent", "203.0.113.50")).status,
      ).toBe(404);
    }
    const limited = await exchange("ZZZZ-ZZZZ", "Agent", "203.0.113.50");
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ code: "RATE_LIMITED" });
    expect((await exchange("ZZZZ-ZZZZ", "Agent", "203.0.113.51")).status).toBe(
      404,
    );
  });
});

describe("who can manage Pairing Codes", () => {
  const operations = [
    ["POST", "/admin/pairing-code"],
    ["GET", "/admin/pairing-code"],
    ["DELETE", "/admin/pairing-code"],
  ] as const;

  it("refuses an API Key, even beside an Admin's session", async () => {
    const cookie = await signIn({ id: "pair-guard", role: "admin" });
    const key = await seedAdminApiKey("pairing-guard");

    for (const [method, path] of operations) {
      for (const headers of [
        { "x-api-key": key },
        { "x-api-key": key, cookie },
      ] as Array<Record<string, string>>) {
        const response = await call(path, { method, headers });
        expect(response.status, `${method} ${path}`).toBe(403);
      }
    }
    expect(await status(cookie)).toEqual({ state: "none" });
  });

  it("refuses a signed-out request and a User who is not an Admin", async () => {
    const reader = await signIn({ id: "pair-reader", role: null });

    for (const [method, path] of operations) {
      expect((await call(path, { method })).status).toBe(401);
      const response = await call(path, {
        method,
        headers: { cookie: reader },
      });
      expect(response.status, `${method} ${path}`).toBe(403);
    }
  });
});
