import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useViewCounts } from "@/features/pageview/queries";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import type { HomePageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";
import { Hero } from "../../components/hero";
import { PostCard } from "../../components/post-card";

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

  const allSlugs = useMemo(
    () => mergedPosts.map((m) => m.post.slug),
    [mergedPosts],
  );
  const { data: viewCounts, isPending: isPendingViewCounts } =
    useViewCounts(allSlugs);

  return (
    <>
      <Hero />

      <div className="yz-shell yz-home__contents">
        {/* 目录页头：像一本书的"最近写的"章节 */}
        <div className="yz-section-head fuwari-onload-animation">
          <h2>{m.home_latest_posts()}</h2>
          <span className="yz-section-head__meta">
            Contents · {mergedPosts.length} entries
          </span>
        </div>

        <div className="yz-contents">
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
                index={i}
                pinned={pinned}
                popular={!pinned && popular}
                views={viewCounts?.[post.slug]}
                isLoadingViews={isPendingViewCounts}
              />
            </div>
          ))}
          <div
            className="yz-contents__foot fuwari-onload-animation"
            style={{
              animationDelay: `calc(var(--fuwari-content-delay) + ${mergedPosts.length * delayOffset}ms)`,
            }}
          >
            <Link to="/posts" className="fuwari-btn-regular h-10 px-6 rounded-sm">
              {m.home_view_all_posts()}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
