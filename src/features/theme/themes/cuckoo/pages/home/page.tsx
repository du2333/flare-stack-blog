import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { HomePageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";
import { PostCard } from "../../components/post-card";

export function HomePage({ posts, pinnedPosts, popularPosts }: HomePageProps) {
  const mergedPosts = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ post: (typeof posts)[number]; pinned: boolean }> = [];

    for (const post of pinnedPosts ?? []) {
      if (seen.has(post.slug)) continue;
      seen.add(post.slug);
      result.push({ post, pinned: true });
    }
    for (const post of popularPosts ?? []) {
      if (seen.has(post.slug)) continue;
      seen.add(post.slug);
      result.push({ post, pinned: false });
    }
    for (const post of posts) {
      if (seen.has(post.slug)) continue;
      seen.add(post.slug);
      result.push({ post, pinned: false });
    }
    return result;
  }, [posts, pinnedPosts, popularPosts]);

  return (
    <div className="cuckoo-onload-animation">
      {mergedPosts.map(({ post, pinned }, i) => (
        <div
          key={post.slug}
          className="cuckoo-onload-animation"
          style={{
            animationDelay: `calc(var(--cuckoo-content-delay) + ${i * 60}ms)`,
          }}
        >
          <PostCard post={post} pinned={pinned} />
        </div>
      ))}

      {/* 查看全部(对应原主题 .changePage) */}
      <div
        className="cuckoo-onload-animation my-5 text-center"
        style={{
          animationDelay: `calc(var(--cuckoo-content-delay) + ${mergedPosts.length * 60}ms)`,
        }}
      >
        <Link
          to="/posts"
          className="cuckoo-card-base cuckoo-card-hoverable cuckoo-text-75 inline-block w-25 pt-2.5 pb-1 text-center text-sm transition-all hover:text-(--cuckoo-accent)"
        >
          {m.home_view_all_posts()}
        </Link>
      </div>
    </div>
  );
}
