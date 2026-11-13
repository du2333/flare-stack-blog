import { describe, expect, it } from "vitest";
import { m } from "@/paraglide/messages";
import {
  getRetryAfterMs,
  getSignInCodeAuthErrorMessage,
  isSignInCodeSpentError,
} from "./auth-errors";

describe("sign-in code errors", () => {
  it("explains each Better Auth code error", () => {
    expect(getSignInCodeAuthErrorMessage({ code: "INVALID_OTP" })).toBe(
      m.auth_error_invalid_otp(),
    );
    expect(getSignInCodeAuthErrorMessage({ code: "OTP_EXPIRED" })).toBe(
      m.auth_error_otp_expired(),
    );
    expect(getSignInCodeAuthErrorMessage({ code: "TOO_MANY_ATTEMPTS" })).toBe(
      m.auth_error_otp_too_many_attempts(),
    );
  });

  it("tells the user how long to wait when rate limited", () => {
    expect(
      getSignInCodeAuthErrorMessage({
        code: "RATE_LIMITED",
        retryAfterMs: 90_500,
      }),
    ).toBe(m.request_error_rate_limited_desc({ seconds: "91" }));
  });

  it("leaves unknown codes to the caller", () => {
    expect(
      getSignInCodeAuthErrorMessage({ code: "SOMETHING_ELSE" }),
    ).toBeUndefined();
    expect(getSignInCodeAuthErrorMessage(null)).toBeUndefined();
  });

  it("sends the user back for a new code only when this one is spent", () => {
    expect(isSignInCodeSpentError({ code: "OTP_EXPIRED" })).toBe(true);
    expect(isSignInCodeSpentError({ code: "TOO_MANY_ATTEMPTS" })).toBe(true);
    expect(isSignInCodeSpentError({ code: "INVALID_OTP" })).toBe(false);
    expect(isSignInCodeSpentError(undefined)).toBe(false);
  });

  it("reads retryAfterMs only from a rate limit answer", () => {
    expect(
      getRetryAfterMs({ code: "RATE_LIMITED", retryAfterMs: 120_000 }),
    ).toBe(120_000);
    expect(getRetryAfterMs({ code: "RATE_LIMITED" })).toBeUndefined();
    expect(
      getRetryAfterMs({ code: "RATE_LIMITED", retryAfterMs: 0 }),
    ).toBeUndefined();
    expect(
      getRetryAfterMs({ code: "INVALID_OTP", retryAfterMs: 5_000 }),
    ).toBeUndefined();
  });
});
