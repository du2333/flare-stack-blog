import { z } from "zod";

const REQUEST_ERROR_PREFIX = "__REQ_ERR__:";

const RequestErrorPayloadSchema = z.discriminatedUnion("code", [
  z.object({
    code: z.literal("UNAUTHENTICATED"),
  }),
  z.object({
    code: z.literal("PERMISSION_DENIED"),
  }),
  z.object({
    code: z.literal("RATE_LIMITED"),
    retryAfterMs: z.number().int().nonnegative(),
  }),
  z.object({
    code: z.literal("TURNSTILE_FAILED"),
    detail: z.enum(["MISSING_TOKEN", "VERIFY_FAILED"]).optional(),
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

export function createAuthError(): Error {
  return createRequestError({
    code: "UNAUTHENTICATED",
  });
}

export function createPermissionError(): Error {
  return createRequestError({
    code: "PERMISSION_DENIED",
  });
}

export function createRateLimitError(retryAfterMs: number): Error {
  return createRequestError({
    code: "RATE_LIMITED",
    retryAfterMs,
  });
}

export function createTurnstileError(
  detail: "MISSING_TOKEN" | "VERIFY_FAILED" = "VERIFY_FAILED",
): Error {
  return createRequestError({
    code: "TURNSTILE_FAILED",
    detail,
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
    error instanceof Error ? error.message : String(error ?? "");

  const payload = parseEnvelopeFromMessage(rawMessage);
  if (!payload) {
    return { code: "UNKNOWN", message: rawMessage };
  }

  return payload;
}
