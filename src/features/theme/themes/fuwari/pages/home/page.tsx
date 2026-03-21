import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useViewCounts } from "@/features/pageview/queries";
import type { HomePageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";
import { PopularPostCard } from "../../components/popular-post-card";
import { PostCard } from "../../components/post-card";

export function HomePage({ posts, pinnedPosts, popularPosts }: HomePageProps) {
  const delayOffset = 50;

  const allSlugs = useMemo(
    () => [
      ...(pinnedPosts ?? []).map((p) => p.slug),
      ...(popularPosts ?? []).map((p) => p.slug),
      ...posts.map((p) => p.slug),
    ],
    [pinnedPosts, popularPosts, posts],
  );
  const { data: viewCounts, isPending: isPendingViewCounts } =
    useViewCounts(allSlugs);

  return (
    <div className="flex flex-col gap-10 md:gap-14">
      {/* 1. Pinned Posts Spotlight */}
      {pinnedPosts && pinnedPosts.length > 0 && (
        <section className="fuwari-onload-animation">
          <div className="flex flex-col gap-4">
            {pinnedPosts.map((post, i) => (
              <div
                key={post.id}
                style={{
                  animationDelay: `calc(var(--fuwari-content-delay) + ${i * delayOffset}ms)`,
                }}
              >
                <PostCard
                  post={post}
                  pinned
                  views={viewCounts?.[post.slug]}
                  isLoadingViews={isPendingViewCounts}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. Popular Posts Gallery */}
      {popularPosts && popularPosts.length > 0 && (
        <section className="fuwari-onload-animation">
          {/* Use snap scrolling for mobile to save vertical space, and grid for desktop */}
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 md:grid md:grid-cols-3 md:overflow-visible md:pb-0 hide-scrollbar px-2 -mx-2 md:mx-0 md:px-0">
            {popularPosts.map((post, i) => (
              <div
                key={post.slug}
                className="h-full flex-none w-[85%] sm:w-1/2 md:w-auto snap-center fuwari-onload-animation"
                style={{
                  animationDelay: `calc(var(--fuwari-content-delay) + ${(i + (pinnedPosts?.length || 0)) * delayOffset}ms)`,
                }}
              >
                <PopularPostCard
                  post={post}
                  views={viewCounts?.[post.slug]}
                  isLoadingViews={isPendingViewCounts}
                  rank={i + 1}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Recent Updates Feed */}
      <section className="fuwari-onload-animation">
        <div className="fuwari-card-base px-5 py-4 mb-4 rounded-(--fuwari-radius-large) flex items-center gap-2.5">
          <Sparkles className="text-blue-500" size={24} />
          <h2 className="text-xl font-bold fuwari-text-80 m-0">
            {m.home_recent_updates()}
          </h2>
        </div>
        <div className="flex flex-col rounded-(--fuwari-radius-large) bg-(--fuwari-card-bg) py-1 md:py-0 md:bg-transparent md:gap-4">
          {posts.map((post, i) => (
            <div
              key={post.id}
              className="fuwari-onload-animation"
              style={{
                animationDelay: `calc(var(--fuwari-content-delay) + ${(i + (pinnedPosts?.length || 0) + (popularPosts?.length || 0)) * delayOffset}ms)`,
              }}
            >
              <PostCard
                post={post}
                views={viewCounts?.[post.slug]}
                isLoadingViews={isPendingViewCounts}
              />
              <div className="border-t border-dashed mx-6 border-black/10 dark:border-white/15 last:border-t-0 md:hidden" />
            </div>
          ))}
          <div
            className="fuwari-onload-animation"
            style={{
              animationDelay: `calc(var(--fuwari-content-delay) + ${(posts.length + (pinnedPosts?.length || 0) + (popularPosts?.length || 0)) * delayOffset}ms)`,
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
      </section>
    </div>
  );
}
