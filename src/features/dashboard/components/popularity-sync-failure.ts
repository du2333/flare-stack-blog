import { ORPCError } from "@orpc/client";
import { m } from "@/paraglide/messages";

/** `SYNC_FAILED` is the sync service's own reason; the rest never got an answer. */
export type PopularitySyncFailure = "SYNC_FAILED" | "UNREACHABLE";

export function popularitySyncFailure(error: unknown): PopularitySyncFailure {
  return error instanceof ORPCError && error.code === "SYNC_FAILED"
    ? "SYNC_FAILED"
    : "UNREACHABLE";
}

export function popularitySyncFailureMessage(reason: PopularitySyncFailure) {
  switch (reason) {
    case "SYNC_FAILED":
      return m.admin_overview_popularity_sync_failed_desc();
    case "UNREACHABLE":
      return m.admin_overview_popularity_sync_unreachable_desc();
    default:
      reason satisfies never;
      return "";
  }
}
