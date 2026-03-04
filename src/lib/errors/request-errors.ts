import { z } from "zod";

const REQUEST_ERROR_PREFIX = "__REQ_ERR__:";

const RequestErrorPayloadSchema = z.discriminatedUnion("code", [
  z.object({
    code: z.literal("UNAUTHENTICATED"),
    message: z.string(),
  }),
  z.object({
    code: z.literal("PERMISSION_DENIED"),
    message: z.string(),
  }),
  z.object({
    code: z.literal("RATE_LIMITED"),
    retryAfterMs: z.number().int().nonnegative(),
    message: z.string(),
  }),
  z.object({
    code: z.literal("TURNSTILE_FAILED"),
    message: z.string(),
  }),
]);

const RequestErrorEnvelopeSchema = z.object({
  v: z.literal(1),
  error: RequestErrorPayloadSchema,
});

export type RequestErrorCode = z.infer<
  typeof RequestErrorPayloadSchema
>["code"];
export type RequestErrorPayload = z.infer<typeof RequestErrorPayloadSchema>;
export type ParsedRequestError =
  | RequestErrorPayload
  | {
      code: "UNKNOWN";
      message: string;
    };

function formatRequestErrorMessage(payload: RequestErrorPayload): string {
  return `${REQUEST_ERROR_PREFIX}${JSON.stringify({ v: 1, error: payload })}`;
}

function createRequestError(payload: RequestErrorPayload): Error {
  return new Error(formatRequestErrorMessage(payload));
}

export function createAuthError(message?: string): Error {
  return createRequestError({
    code: "UNAUTHENTICATED",
    message: message ?? "登录状态已失效，请重新登录",
  });
}

export function createPermissionError(message?: string): Error {
  return createRequestError({
    code: "PERMISSION_DENIED",
    message: message ?? "权限不足",
  });
}

export function createRateLimitError(
  retryAfterMs: number,
  message?: string,
): Error {
  return createRequestError({
    code: "RATE_LIMITED",
    retryAfterMs,
    message:
      message ?? `请求过于频繁，请 ${Math.ceil(retryAfterMs / 1000)} 秒后重试`,
  });
}

export function createTurnstileError(message?: string): Error {
  return createRequestError({
    code: "TURNSTILE_FAILED",
    message: message ?? "人机验证失败，请刷新页面重试",
  });
}

function parseEnvelopeFromMessage(message: string): RequestErrorPayload | null {
  if (!message.startsWith(REQUEST_ERROR_PREFIX)) {
    return null;
  }
  const encoded = message.slice(REQUEST_ERROR_PREFIX.length);
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(encoded);
  } catch {
    return null;
  }
  const parsed = RequestErrorEnvelopeSchema.safeParse(parsedJson);
  return parsed.success ? parsed.data.error : null;
}

export function parseRequestError(error: unknown): ParsedRequestError {
  const rawMessage =
    error instanceof Error ? error.message : String(error ?? "未知错误");

  const payload = parseEnvelopeFromMessage(rawMessage);
  if (!payload) {
    return { code: "UNKNOWN", message: rawMessage };
  }

  if (payload.code === "RATE_LIMITED") {
    return {
      code: payload.code,
      retryAfterMs: payload.retryAfterMs,
      message: payload.message,
    };
  }

  return {
    code: payload.code,
    message: payload.message,
  };
}
