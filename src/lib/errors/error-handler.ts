import { toast } from "sonner";
import { m } from "@/paraglide/messages";
import { parseRequestError } from "./request-errors";

export function handleServerError(error: unknown): void {
  const parsed = parseRequestError(error);
  const { code } = parsed;

  switch (code) {
    case "UNAUTHENTICATED": {
      toast.error(m.request_error_unauthenticated_title(), {
        description: m.request_error_unauthenticated_desc(),
      });
      break;
    }
    case "PERMISSION_DENIED": {
      toast.error(m.request_error_permission_denied_title(), {
        description: m.request_error_permission_denied_desc(),
      });
      break;
    }
    case "RATE_LIMITED": {
      const seconds = Math.max(1, Math.ceil(parsed.retryAfterMs / 1000));
      toast.warning(m.request_error_rate_limited_title(), {
        description: m.request_error_rate_limited_desc({
          seconds: String(seconds),
        }),
      });
      break;
    }
    case "TURNSTILE_FAILED": {
      const description =
        parsed.detail === "MISSING_TOKEN"
          ? m.request_error_turnstile_missing_token_desc()
          : m.request_error_turnstile_failed_desc();

      toast.error(m.request_error_turnstile_failed_title(), {
        description,
      });
      break;
    }
    case "UNKNOWN": {
      console.error("[Unhandled request error]", parsed.message);
      break;
    }
    default:
      code satisfies never;
  }
}
