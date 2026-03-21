import { z } from "zod";
import * as CacheService from "@/features/cache/cache.service";
import * as PageviewRepo from "@/features/pageview/data/pageview.data";

const PopularPostsSchema = z.array(
  z.object({
    slug: z.string(),
    title: z.string(),
    views: z.number(),
  }),
);

const POPULAR_CACHE_KEY = ["homepage", "popular"] as const;

export async function getPopularPosts(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return CacheService.get(
    context,
    POPULAR_CACHE_KEY,
    PopularPostsSchema,
    () => PageviewRepo.getTopPosts(context.db, thirtyDaysAgo, now, 5),
    { ttl: "3h" },
  );
}
