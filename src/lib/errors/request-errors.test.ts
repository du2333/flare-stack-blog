import { describe, expect, it } from "vitest";
import { parseRequestError } from "@/lib/errors/request-errors";

const envelope = (error: unknown, v: unknown = 1) =>
  new Error(`__REQ_ERR__:${JSON.stringify({ v, error })}`);

const unknown = (message: string) => ({ code: "UNKNOWN", message });

describe("parseRequestError", () => {
  it.each([
    ["unauthenticated", { code: "UNAUTHENTICATED" }],
    ["permission denied", { code: "PERMISSION_DENIED" }],
    ["rate limited", { code: "RATE_LIMITED", retryAfterMs: 1500 }],
    ["rate limited at once", { code: "RATE_LIMITED", retryAfterMs: 0 }],
    ["turnstile failed", { code: "TURNSTILE_FAILED" }],
    [
      "turnstile without a token",
      { code: "TURNSTILE_FAILED", detail: "MISSING_TOKEN" },
    ],
    [
      "turnstile that did not verify",
      { code: "TURNSTILE_FAILED", detail: "VERIFY_FAILED" },
    ],
  ])("reads %s", (_label, payload) => {
    expect(parseRequestError(envelope(payload))).toEqual(payload);
  });

  it("reads an envelope in a string", () => {
    const message = `__REQ_ERR__:${JSON.stringify({ v: 1, error: { code: "UNAUTHENTICATED" } })}`;
    expect(parseRequestError(message)).toEqual({ code: "UNAUTHENTICATED" });
  });

  it("drops keys a payload does not have", () => {
    expect(
      parseRequestError(envelope({ code: "UNAUTHENTICATED", extra: 1 })),
    ).toEqual({ code: "UNAUTHENTICATED" });
  });

  it.each([
    ["a code that does not exist", { code: "NOPE" }],
    ["no code", {}],
    ["a rate limit without a wait", { code: "RATE_LIMITED" }],
    ["a negative wait", { code: "RATE_LIMITED", retryAfterMs: -1 }],
    ["a fractional wait", { code: "RATE_LIMITED", retryAfterMs: 1.5 }],
    ["a wait that is a string", { code: "RATE_LIMITED", retryAfterMs: "5" }],
    [
      "a turnstile detail that does not exist",
      {
        code: "TURNSTILE_FAILED",
        detail: "OTHER",
      },
    ],
    ["no payload", undefined],
  ])("answers UNKNOWN for %s", (_label, payload) => {
    const error = envelope(payload);
    expect(parseRequestError(error)).toEqual(unknown(error.message));
  });

  it("answers UNKNOWN for another envelope version", () => {
    const error = envelope({ code: "UNAUTHENTICATED" }, 2);
    expect(parseRequestError(error)).toEqual(unknown(error.message));
  });

  it("answers UNKNOWN for a message that is no envelope", () => {
    expect(parseRequestError(new Error("boom"))).toEqual(unknown("boom"));
    expect(parseRequestError("plain")).toEqual(unknown("plain"));
    expect(parseRequestError(undefined)).toEqual(unknown(""));
    expect(parseRequestError(42)).toEqual(unknown(""));
    expect(parseRequestError(new Error("__REQ_ERR__:{broken"))).toEqual(
      unknown("__REQ_ERR__:{broken"),
    );
  });
});
