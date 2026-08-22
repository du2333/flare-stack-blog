import { defineEntry } from "@/features/cache/public-cache";
import * as PageviewRepo from "@/features/pageview/data/pageview.data";
import * as PostRepo from "@/features/posts/data/posts.data";
import { PostItemSchema } from "@/features/posts/schema/posts.schema";

export const popularPosts = defineEntry({
  name: "posts.popular",
  namespace: "posts:popular",
  key: ({ limit }: { limit: number }) => ["homepage", "popular", limit],
  schema: PostItemSchema.array(),
  ttl: "3h",
  invalidatedBy: ["post.published", "post.deleted"],
  load: async (context, { limit }) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topPages = await PageviewRepo.getTopPages(
      context.db,
      thirtyDaysAgo,
      now,
      limit,
    );
    if (topPages.length === 0) return [];

    const slugs = topPages.map((p) => p.slug);
    const posts = await PostRepo.findPostsBySlugs(context.db, slugs);
    const bySlug = new Map(posts.map((p) => [p.slug, p]));
    return slugs.flatMap((slug) => {
      const post = bySlug.get(slug);
      return post ? [post] : [];
    });
  },
});
