import * as CacheService from "@/features/cache/cache.service";
import * as PageviewRepo from "@/features/pageview/data/pageview.data";
import {
  PAGEVIEW_CACHE_KEYS,
  ViewCountsSchema,
} from "@/features/pageview/pageview.schema";
import * as PostRepo from "@/features/posts/data/posts.data";
import { PostItemSchema } from "@/features/posts/schema/posts.schema";

export async function getPopularPosts(
  context: DbContext & { executionCtx: ExecutionContext },
  limit = 5,
) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const version = await CacheService.getVersion(context, "posts:list");
  return CacheService.get(
    context,
    [version, ...PAGEVIEW_CACHE_KEYS.popular, limit],
    PostItemSchema.array(),
    async () => {
      const topPages = await PageviewRepo.getTopPages(
        context.db,
        thirtyDaysAgo,
        now,
        limit,
      );
      if (topPages.length === 0) return [];

      const slugs = topPages.map((p) => p.slug);
      const posts = await PostRepo.findPostsBySlugs(context.db, slugs);

      // Preserve popularity order
      const bySlug = new Map(posts.map((p) => [p.slug, p]));
      return slugs.flatMap((slug) => {
        const post = bySlug.get(slug);
        return post ? [post] : [];
      });
    },
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
