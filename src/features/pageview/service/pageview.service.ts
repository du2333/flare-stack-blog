import { z } from "zod";
import * as CacheService from "@/features/cache/cache.service";
import * as PageviewRepo from "@/features/pageview/data/pageview.data";
import { PAGEVIEW_CACHE_KEYS } from "@/features/pageview/pageview.schema";

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
