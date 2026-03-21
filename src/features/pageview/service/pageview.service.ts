import { z } from "zod";
import * as CacheService from "@/features/cache/cache.service";
import * as PageviewRepo from "@/features/pageview/data/pageview.data";
import {
  PAGEVIEW_CACHE_KEYS,
  ViewCountsSchema,
} from "@/features/pageview/pageview.schema";

const PopularPostsSchema = z.array(
  z.object({
    slug: z.string(),
    title: z.string(),
    views: z.number(),
  }),
);

export async function getPopularPosts(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return CacheService.get(
    context,
    PAGEVIEW_CACHE_KEYS.popular,
    PopularPostsSchema,
    () => PageviewRepo.getTopPosts(context.db, thirtyDaysAgo, now, 5),
    { ttl: "3h" },
  );
}

export async function getViewCounts(
  context: DbContext & { executionCtx: ExecutionContext },
  slugs: string[],
) {
  if (slugs.length === 0) return {};

  return CacheService.get(
    context,
    PAGEVIEW_CACHE_KEYS.viewCounts(slugs),
    ViewCountsSchema,
    () => PageviewRepo.getViewCountsBySlugs(context.db, slugs),
    { ttl: "5m" },
  );
}
