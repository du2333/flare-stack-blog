import { z } from "zod/mini";

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
    retryAfterMs: z.int().check(z.nonnegative()),
  }),
  z.object({
    code: z.literal("TURNSTILE_FAILED"),
    detail: z.optional(z.enum(["MISSING_TOKEN", "VERIFY_FAILED"])),
  }),
]);

const RequestErrorEnvelopeSchema = z.object({
  v: z.literal(1),
  error: RequestErrorPayloadSchema,
});

export type RequestErrorPayload = z.infer<typeof RequestErrorPayloadSchema>;
export type ParsedRequestError =
  | RequestErrorPayload
  | {
      code: "UNKNOWN";
      message: string;
    };

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
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  const payload = parseEnvelopeFromMessage(rawMessage);
  if (!payload) {
    return { code: "UNKNOWN", message: rawMessage };
  }

  return payload;
}
