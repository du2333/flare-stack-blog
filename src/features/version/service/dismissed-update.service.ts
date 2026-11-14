import * as kvStore from "@/features/cache/kv-store";
import { serializeKey } from "@/features/cache/serialize";
import type { UpdateCheckResult } from "@/features/version/update-check.schema";
import { DISMISSED_UPDATE_KEY } from "@/features/version/update-check.schema";
import { ApplicationReleaseVersionSchema } from "@/features/version/version.schema";
import type { Result } from "@/lib/errors";
import { err, ok } from "@/lib/errors";

// The latest version an Admin chose to stop being reminded of is kept on the
// server, one KV key with no expiry, so every browser agrees. It is for that
// version only: once a newer one is the latest, the notice comes back whole.

/** The dismissed version; a stored value that is not a version reads as none. */
export async function readDismissedVersion(
  context: BaseContext,
): Promise<string | null> {
  const stored = await kvStore.get(context, DISMISSED_UPDATE_KEY);
  const parsed = ApplicationReleaseVersionSchema.safeParse(stored);
  return parsed.success ? parsed.data : null;
}

/** `result` with `dismissed` set from the record. */
export async function withDismissal(
  context: BaseContext,
  result: UpdateCheckResult,
): Promise<UpdateCheckResult> {
  if (!result.hasUpdate) return { ...result, dismissed: false };
  const dismissed = await readDismissedVersion(context);
  return { ...result, dismissed: dismissed === result.latestVersion };
}

type CheckAnswer = Result<UpdateCheckResult, { reason: "FETCH_FAILED" }>;

/**
 * Records `version` as dismissed, or clears the record with null. Only the
 * version the check reports as the latest, with an update behind it, is
 * accepted: a tab that has not seen a newer release cannot dismiss it. The
 * write goes to KV directly, not through the cache helpers that swallow
 * failures, so a failed write is reported as one.
 */
export async function dismissUpdate<TContext extends BaseContext>(
  context: TContext,
  version: string | null,
  check: (context: TContext) => Promise<CheckAnswer>,
): Promise<
  Result<{ success: true }, { reason: "FETCH_FAILED" | "NOT_LATEST" }>
> {
  const key = serializeKey(DISMISSED_UPDATE_KEY);
  if (version === null) {
    await context.env.KV.delete(key);
    return ok({ success: true });
  }
  const answer = await check(context);
  if (answer.error) return err({ reason: "FETCH_FAILED" });
  const { hasUpdate, latestVersion } = answer.data;
  if (!hasUpdate || latestVersion !== version) {
    return err({ reason: "NOT_LATEST" });
  }
  await context.env.KV.put(key, version);
  return ok({ success: true });
}
