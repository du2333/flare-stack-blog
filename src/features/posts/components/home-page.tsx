import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { m } from "@/paraglide/messages";
import { PostCard } from "./post-card";

export const RECENT_POSTS_LIMIT = 5;
export const POPULAR_POSTS_LIMIT = 3;

interface HomePageProps {
  posts: Array<PostItem>;
  pinnedPosts?: Array<PostItem>;
  popularPosts?: Array<PostItem>;
}

interface MergedPost {
  post: PostItem;
  pinned: boolean;
  popular: boolean;
}

export function HomePage({ posts, pinnedPosts, popularPosts }: HomePageProps) {
  const delayOffset = 50;

  const mergedPosts = useMemo(() => {
    const seen = new Set<string>();
    const result: MergedPost[] = [];
    const popularSlugs = new Set((popularPosts ?? []).map((p) => p.slug));

    // 1. Pinned first
    for (const post of pinnedPosts ?? []) {
      if (seen.has(post.slug)) continue;
      seen.add(post.slug);
      result.push({ post, pinned: true, popular: popularSlugs.has(post.slug) });
    }

    // 2. Popular next (excluding already added)
    for (const post of popularPosts ?? []) {
      if (seen.has(post.slug)) continue;
      seen.add(post.slug);
      result.push({ post, pinned: false, popular: true });
    }

    // 3. Recent fills the rest
    for (const post of posts) {
      if (seen.has(post.slug)) continue;
      seen.add(post.slug);
      result.push({ post, pinned: false, popular: false });
    }

    return result;
  }, [posts, pinnedPosts, popularPosts]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col rounded-(--fuwari-radius-large) bg-(--fuwari-card-bg) py-1 md:py-0 md:bg-transparent md:gap-4">
        {mergedPosts.map(({ post, pinned, popular }, i) => (
          <div
            key={post.slug}
            className="fuwari-onload-animation"
            style={{
              animationDelay: `calc(var(--fuwari-content-delay) + ${i * delayOffset}ms)`,
            }}
          >
            <PostCard
              post={post}
              pinned={pinned}
              popular={!pinned && popular}
            />
            <div className="border-t border-dashed mx-6 border-black/10 dark:border-white/15 last:border-t-0 md:hidden" />
          </div>
        ))}
        <div
          className="fuwari-onload-animation"
          style={{
            animationDelay: `calc(var(--fuwari-content-delay) + ${mergedPosts.length * delayOffset}ms)`,
          }}
        >
          <Link
            to="/posts"
            className="fuwari-btn-regular mx-6 rounded-lg h-10 px-6 mt-4 flex items-center justify-center mb-4 md:mb-0 md:mx-auto"
          >
            {m.home_view_all_posts()}
          </Link>
        </div>
      </div>
    </div>
  );
}
