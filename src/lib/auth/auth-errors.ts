import type { BetterAuthErrorCode } from "@/lib/auth/auth-client";
import { m } from "@/paraglide/messages";

const CUSTOM_AUTH_ERROR_CODES = [
  "RATE_LIMITED",
  "TURNSTILE_MISSING_TOKEN",
  "TURNSTILE_VERIFICATION_FAILED",
] as const;

type CustomAuthErrorCode = (typeof CUSTOM_AUTH_ERROR_CODES)[number];

const COMMON_AUTH_ERROR_CODES = [
  "USER_NOT_FOUND",
  "SESSION_EXPIRED",
  "INVALID_OTP",
  "OTP_EXPIRED",
  "TOO_MANY_ATTEMPTS",
] as const satisfies ReadonlyArray<BetterAuthErrorCode>;

type CommonAuthErrorCode = (typeof COMMON_AUTH_ERROR_CODES)[number];

export interface AuthClientErrorLike {
  code?: string | null;
  retryAfterMs?: number | null;
}

function getErrorCode(error: AuthClientErrorLike | null | undefined) {
  return typeof error?.code === "string" ? error.code : undefined;
}

function isCustomAuthErrorCode(code: string): code is CustomAuthErrorCode {
  return CUSTOM_AUTH_ERROR_CODES.some(
    (authErrorCode) => authErrorCode === code,
  );
}

function isCommonAuthErrorCode(code: string): code is CommonAuthErrorCode {
  return COMMON_AUTH_ERROR_CODES.some(
    (authErrorCode) => authErrorCode === code,
  );
}

function getCustomAuthErrorMessage(
  error: AuthClientErrorLike | null | undefined,
): string | undefined {
  const code = getErrorCode(error);
  if (!code || !isCustomAuthErrorCode(code)) return undefined;

  switch (code) {
    case "TURNSTILE_MISSING_TOKEN":
    case "TURNSTILE_VERIFICATION_FAILED":
      return m.turnstile_error_failed_desc();
    case "RATE_LIMITED": {
      const seconds =
        typeof error?.retryAfterMs === "number"
          ? Math.max(1, Math.ceil(error.retryAfterMs / 1000))
          : 60;

      return m.request_error_rate_limited_desc({
        seconds: String(seconds),
      });
    }
  }
}

function getSharedAuthErrorMessage(
  error: AuthClientErrorLike | null | undefined,
): string | undefined {
  const customMessage = getCustomAuthErrorMessage(error);
  if (customMessage) return customMessage;

  const code = getErrorCode(error);
  if (!code || !isCommonAuthErrorCode(code)) return undefined;

  switch (code) {
    case "USER_NOT_FOUND":
      return m.auth_error_user_not_found();
    case "SESSION_EXPIRED":
      return m.auth_error_session_expired();
    case "INVALID_OTP":
      return m.auth_error_invalid_otp();
    case "OTP_EXPIRED":
      return m.auth_error_otp_expired();
    case "TOO_MANY_ATTEMPTS":
      return m.auth_error_otp_too_many_attempts();
  }
}

/** The code can no longer be used, so the user has to request a new one. */
export function isSignInCodeSpentError(
  error: AuthClientErrorLike | null | undefined,
) {
  const code = getErrorCode(error);
  return code === "OTP_EXPIRED" || code === "TOO_MANY_ATTEMPTS";
}

/** How long the server asks the client to wait, when it rate limited us. */
export function getRetryAfterMs(error: AuthClientErrorLike | null | undefined) {
  const retryAfterMs = error?.retryAfterMs;
  return getErrorCode(error) === "RATE_LIMITED" &&
    typeof retryAfterMs === "number" &&
    Number.isFinite(retryAfterMs) &&
    retryAfterMs > 0
    ? retryAfterMs
    : undefined;
}

export function getSignInCodeAuthErrorMessage(
  error: AuthClientErrorLike | null | undefined,
): string | undefined {
  return getSharedAuthErrorMessage(error);
}

export function getSocialLoginAuthErrorMessage(
  error: AuthClientErrorLike | null | undefined,
): string | undefined {
  return getSharedAuthErrorMessage(error);
}

export function getProfileAuthErrorMessage(
  error: AuthClientErrorLike | null | undefined,
): string | undefined {
  return getSharedAuthErrorMessage(error);
}

export function getLogoutAuthErrorMessage(
  error: AuthClientErrorLike | null | undefined,
): string | undefined {
  return getSharedAuthErrorMessage(error);
}
