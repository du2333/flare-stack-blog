import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { signOut } from "./sign-out";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

it("sends what Better Auth's client sends for signOut()", async () => {
  fetchMock.mockResolvedValue(Response.json({ success: true }));
  expect(await signOut()).toEqual({ error: null });
  expect(fetchMock).toHaveBeenCalledWith("/api/auth/sign-out", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
});

it("passes on the code and the wait of a refusal", async () => {
  fetchMock.mockResolvedValue(
    Response.json(
      {
        code: "RATE_LIMITED",
        message: "Too Many Requests",
        retryAfterMs: 4000,
      },
      { status: 429 },
    ),
  );
  expect(await signOut()).toEqual({
    error: { code: "RATE_LIMITED", retryAfterMs: 4000 },
  });
});

it("fails without a code when the answer is not JSON or never comes", async () => {
  fetchMock.mockResolvedValueOnce(new Response("Bad gateway", { status: 502 }));
  expect(await signOut()).toEqual({
    error: { code: null, retryAfterMs: null },
  });
  fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  expect(await signOut()).toEqual({ error: {} });
});
