import type { PostItem } from "@/features/posts/schema/posts.schema";
import { HomePagination } from "./home-pagination";
import { PostCard } from "./post-card";

export const POPULAR_POSTS_LIMIT = 3;

interface HomePageProps {
  posts: Array<PostItem>;
  popularPosts?: Array<PostItem>;
  page: number;
  totalPages: number;
}

export function HomePage({
  posts,
  popularPosts,
  page,
  totalPages,
}: HomePageProps) {
  const popularSlugs = new Set((popularPosts ?? []).map((post) => post.slug));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col rounded-(--theme-card-radius) bg-(--theme-surface) py-1 md:py-0 md:bg-transparent md:gap-4">
        {posts.map((post, i) => (
          <div
            key={post.slug}
            className="fuwari-onload-animation py-(--theme-row-pad-y)"
            style={{
              animationDelay: `calc(var(--fuwari-content-delay) + ${i * 50}ms)`,
            }}
          >
            <PostCard
              post={post}
              pinned={Boolean(post.pinnedAt)}
              popular={!post.pinnedAt && popularSlugs.has(post.slug)}
            />
            {i < posts.length - 1 && (
              <div className="border-t border-dashed mx-6 border-black/10 dark:border-white/15 md:hidden" />
            )}
          </div>
        ))}
      </div>
      <HomePagination page={page} totalPages={totalPages} />
    </div>
  );
}
