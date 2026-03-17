import * as CacheService from "@/features/cache/cache.service";
import { logPostAutoSnapshot } from "@/features/posts/services/post-auto-snapshot.logging";

export const DEFAULT_AUTO_SNAPSHOT_QUIET_WINDOW_SECONDS = 30;
export const AUTO_SNAPSHOT_QUEUE_THROTTLE_TTL = "60s";

function getPostAutoSnapshotThrottleKey(postId: number) {
  return `post:auto-snapshot:queued:${postId}` as const;
}

export async function enqueuePostAutoSnapshot(
  context: DbContext,
  data: {
    postId: number;
    quietWindowSeconds?: number;
    source?: string;
  },
) {
  const throttleKey = getPostAutoSnapshotThrottleKey(data.postId);
  const alreadyQueued = await CacheService.getRaw(context, throttleKey);
  if (alreadyQueued) {
    logPostAutoSnapshot(context.env, "enqueue_skipped_throttled", {
      postId: data.postId,
      throttleKey,
      throttleTtl: AUTO_SNAPSHOT_QUEUE_THROTTLE_TTL,
      source: data.source ?? "unknown",
    });
    return;
  }

  await CacheService.set(context, throttleKey, "1", {
    ttl: AUTO_SNAPSHOT_QUEUE_THROTTLE_TTL,
  });

  const quietWindowSeconds =
    data.quietWindowSeconds ?? DEFAULT_AUTO_SNAPSHOT_QUIET_WINDOW_SECONDS;

  await context.env.QUEUE.send({
    type: "POST_AUTO_SNAPSHOT",
    data: {
      postId: data.postId,
      quietWindowSeconds,
    },
  });

  logPostAutoSnapshot(context.env, "queue_message_sent", {
    postId: data.postId,
    throttleKey,
    throttleTtl: AUTO_SNAPSHOT_QUEUE_THROTTLE_TTL,
    quietWindowSeconds,
    source: data.source ?? "unknown",
  });
}
