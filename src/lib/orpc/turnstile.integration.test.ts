import { call, os } from "@orpc/server";
import { createTestContext } from "tests/test-utils";
import { describe, expect, it, vi } from "vitest";
import { verifyTurnstileToken } from "@/lib/turnstile";
import type { ApiContext } from "./context";
import {
  turnstileErrors,
  turnstileMiddleware,
  turnstileUnlessAdmin,
} from "./procedure";

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(() => Promise.resolve({ success: true })),
}));

const base = os.$context<ApiContext>().errors(turnstileErrors);
const always = base.use(turnstileMiddleware).handler(() => "done");
const unlessAdmin = base.use(turnstileUnlessAdmin).handler(() => "done");

/** A request from someone with this role (null: signed out), with or without a token. */
function contextOf(role: "admin" | "user" | null, token?: string) {
  const test = createTestContext();
  return {
    ...test,
    env: { ...test.env, TURNSTILE_SECRET_KEY: "secret" } as Env,
    headers: new Headers(token ? { "X-Turnstile-Token": token } : {}),
    getAuth: async () =>
      ({
        api: {
          getSession: async () =>
            role ? { user: { id: "someone", role } } : null,
        },
      }) as never,
  } satisfies ApiContext;
}

describe("the Turnstile check", () => {
  it("refuses a request without a token and passes one whose token verifies", async () => {
    await expect(
      call(always, undefined, { context: contextOf("admin") }),
    ).rejects.toMatchObject({
      code: "TURNSTILE_FAILED",
      data: { detail: "MISSING_TOKEN" },
    });
    await expect(
      call(always, undefined, { context: contextOf("user", "token") }),
    ).resolves.toBe("done");
  });

  it("does not challenge an Admin where the operation says so, and still challenges everyone else", async () => {
    vi.mocked(verifyTurnstileToken).mockClear();
    await expect(
      call(unlessAdmin, undefined, { context: contextOf("admin") }),
    ).resolves.toBe("done");
    expect(verifyTurnstileToken).not.toHaveBeenCalled();

    for (const role of ["user", null] as const)
      await expect(
        call(unlessAdmin, undefined, { context: contextOf(role) }),
      ).rejects.toMatchObject({ code: "TURNSTILE_FAILED" });
    await expect(
      call(unlessAdmin, undefined, { context: contextOf("user", "token") }),
    ).resolves.toBe("done");
  });

  it("is off where no secret is configured", async () => {
    const context = contextOf("user");
    await expect(
      call(always, undefined, {
        context: {
          ...context,
          env: { ...context.env, TURNSTILE_SECRET_KEY: undefined } as Env,
        },
      }),
    ).resolves.toBe("done");
  });
});
