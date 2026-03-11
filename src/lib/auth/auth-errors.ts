import type { BetterAuthErrorCode } from "@/lib/auth/auth.client";
import type { Messages } from "@/lib/i18n";

const CUSTOM_AUTH_ERROR_CODES = [
  "RATE_LIMITED",
  "TURNSTILE_MISSING_TOKEN",
  "TURNSTILE_VERIFICATION_FAILED",
] as const;

type CustomAuthErrorCode = (typeof CUSTOM_AUTH_ERROR_CODES)[number];

const COMMON_AUTH_ERROR_CODES = [
  "USER_ALREADY_EXISTS",
  "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
  "INVALID_PASSWORD",
  "USER_NOT_FOUND",
  "INVALID_TOKEN",
  "SESSION_EXPIRED",
  "CREDENTIAL_ACCOUNT_NOT_FOUND",
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
  messages: Messages,
): string | undefined {
  const code = getErrorCode(error);
  if (!code || !isCustomAuthErrorCode(code)) return undefined;

  switch (code) {
    case "TURNSTILE_MISSING_TOKEN":
    case "TURNSTILE_VERIFICATION_FAILED":
      return messages.turnstile_error_failed_desc();
    case "RATE_LIMITED": {
      const seconds =
        typeof error?.retryAfterMs === "number"
          ? Math.max(1, Math.ceil(error.retryAfterMs / 1000))
          : 60;

      return messages.request_error_rate_limited_desc({
        seconds: String(seconds),
      });
    }
  }
}

function getSharedAuthErrorMessage(
  error: AuthClientErrorLike | null | undefined,
  messages: Messages,
  options?: {
    invalidTokenMessage?: string;
    userNotFoundMessage?: string;
  },
): string | undefined {
  const customMessage = getCustomAuthErrorMessage(error, messages);
  if (customMessage) return customMessage;

  const code = getErrorCode(error);
  if (!code || !isCommonAuthErrorCode(code)) return undefined;

  switch (code) {
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return messages.auth_error_user_already_exists();
    case "INVALID_PASSWORD":
      return messages.auth_error_invalid_password();
    case "USER_NOT_FOUND":
      return (
        options?.userNotFoundMessage ?? messages.auth_error_user_not_found()
      );
    case "INVALID_TOKEN":
      return (
        options?.invalidTokenMessage ?? messages.auth_error_invalid_token()
      );
    case "SESSION_EXPIRED":
      return messages.auth_error_session_expired();
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
      return messages.auth_error_credential_not_found();
  }
}

export function isEmailNotVerifiedError(
  error: AuthClientErrorLike | null | undefined,
) {
  return getErrorCode(error) === "EMAIL_NOT_VERIFIED";
}

export function getLoginAuthErrorMessage(
  error: AuthClientErrorLike | null | undefined,
  messages: Messages,
): string | undefined {
  const code = getErrorCode(error);
  switch (code) {
    case "EMAIL_NOT_VERIFIED":
      return messages.login_error_email_not_verified();
    case "INVALID_EMAIL_OR_PASSWORD":
      return messages.login_error_invalid_credentials();
    default:
      return getSharedAuthErrorMessage(error, messages, {
        userNotFoundMessage: messages.login_error_invalid_credentials(),
      });
  }
}

export function getRegisterAuthErrorMessage(
  error: AuthClientErrorLike | null | undefined,
  messages: Messages,
): string | undefined {
  return getSharedAuthErrorMessage(error, messages);
}

export function getForgotPasswordAuthErrorMessage(
  error: AuthClientErrorLike | null | undefined,
  messages: Messages,
): string | undefined {
  return getSharedAuthErrorMessage(error, messages);
}

export function getResetPasswordAuthErrorMessage(
  error: AuthClientErrorLike | null | undefined,
  messages: Messages,
): string | undefined {
  return getSharedAuthErrorMessage(error, messages, {
    invalidTokenMessage: messages.reset_password_toast_failed_desc(),
  });
}

export function getSocialLoginAuthErrorMessage(
  error: AuthClientErrorLike | null | undefined,
  messages: Messages,
): string | undefined {
  return getSharedAuthErrorMessage(error, messages);
}

export function getProfileAuthErrorMessage(
  error: AuthClientErrorLike | null | undefined,
  messages: Messages,
): string | undefined {
  return getSharedAuthErrorMessage(error, messages);
}

export function getPasswordAuthErrorMessage(
  error: AuthClientErrorLike | null | undefined,
  messages: Messages,
): string | undefined {
  return getSharedAuthErrorMessage(error, messages);
}

export function getLogoutAuthErrorMessage(
  error: AuthClientErrorLike | null | undefined,
  messages: Messages,
): string | undefined {
  return getSharedAuthErrorMessage(error, messages);
}
