import * as CacheService from "@/features/cache/cache.service";

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
  },
) {
  const throttleKey = getPostAutoSnapshotThrottleKey(data.postId);
  const alreadyQueued = await CacheService.getRaw(context, throttleKey);
  if (alreadyQueued) {
    return;
  }

  await CacheService.set(context, throttleKey, "1", {
    ttl: AUTO_SNAPSHOT_QUEUE_THROTTLE_TTL,
  });

  await context.env.QUEUE.send({
    type: "POST_AUTO_SNAPSHOT",
    data: {
      postId: data.postId,
      quietWindowSeconds:
        data.quietWindowSeconds ?? DEFAULT_AUTO_SNAPSHOT_QUIET_WINDOW_SECONDS,
    },
  });
}
