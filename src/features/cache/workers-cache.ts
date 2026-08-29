import type { WorkersCachePurgeTarget } from "./workers-cache-policy";

const TAGS_PER_PURGE = 100;

export function hasWorkersCachePurge(cache: { purge?: unknown }): cache is {
  purge: (options: CachePurgeOptions) => Promise<CachePurgeResult>;
} {
  return typeof cache.purge === "function";
}

async function assertPurge(result: CachePurgeResult) {
  if (result.success) return;
  throw new Error(
    JSON.stringify({
      message: "workers cache purge failed",
      errors: result.errors,
    }),
  );
}

export async function purgeWorkersCache(target: WorkersCachePurgeTarget) {
  const { cache } = await import("cloudflare:workers");
  if (!hasWorkersCachePurge(cache)) return;

  if ("purgeEverything" in target) {
    await assertPurge(await cache.purge(target));
    return;
  }

  const tags = [...new Set(target.tags)];
  if (tags.length === 0) return;

  for (let i = 0; i < tags.length; i += TAGS_PER_PURGE) {
    await assertPurge(
      await cache.purge({ tags: tags.slice(i, i + TAGS_PER_PURGE) }),
    );
  }
}
