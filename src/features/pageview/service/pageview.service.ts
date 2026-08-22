import * as kvStore from "@/features/cache/kv-store";
import * as PageviewRepo from "@/features/pageview/data/pageview.data";
import { popularPosts } from "@/features/pageview/pageview.cache";
import {
  PAGEVIEW_CACHE_KEYS,
  ViewCountsSchema,
} from "@/features/pageview/pageview.schema";

export async function getPopularPosts(
  context: DbContext & { executionCtx: ExecutionContext },
  limit = 5,
) {
  return popularPosts.get(context, { limit });
}

export async function getViewCounts(
  context: DbContext & { executionCtx: ExecutionContext },
  slugs: string[],
) {
  if (slugs.length === 0) return {};

  return kvStore.remember(
    context,
    PAGEVIEW_CACHE_KEYS.viewCounts(slugs),
    ViewCountsSchema,
    () => PageviewRepo.getViewCountsBySlugs(context.db, slugs),
    { ttl: "5m" },
  );
}
