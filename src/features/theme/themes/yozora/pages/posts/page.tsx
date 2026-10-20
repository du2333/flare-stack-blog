import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostsPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";
import { ArchivePanel } from "../../components/archive/archive-panel";

export function PostsPage({
  posts,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: PostsPageProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "0px" },
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="yz-shell yz-book">
      {/* 书脊页头：与首页 Hero 同一种偏心大衬线语言 */}
      <header className="yz-book__head fuwari-onload-animation">
        <div className="yz-hero__pagemark">
          <svg width="34" height="10" viewBox="0 0 34 10" fill="none" aria-hidden="true">
            <path d="M1 5h12" stroke="currentColor" strokeWidth=".8" />
            <path
              d="M18 1.6c3.2 0 3.2 6.8 6.4 6.8s3.2-6.8 6.4-6.8"
              stroke="var(--yz-gold)"
              strokeWidth=".8"
              fill="none"
            />
          </svg>
          <span>Contents · 目录</span>
        </div>
        <h1 className="yz-book__title">{m.posts_title()}</h1>
      </header>

      <div className="fuwari-onload-animation" style={{ animationDelay: "80ms" }}>
        {posts.length > 0 && <ArchivePanel posts={posts} />}
      </div>

      {/* Infinite Scroll trigger and loading indicator */}
      <div
        ref={observerRef}
        className="flex flex-col items-center justify-center pt-2 pb-8"
      >
        {isFetchingNextPage ? (
          <div className="w-full opacity-70 animate-pulse py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="yz-tocline">
                <div className="yz-tocline__link">
                  <Skeleton className="h-3 w-10 rounded-sm bg-(--yz-rule)" />
                  <Skeleton className="h-4 w-2/5 rounded-sm bg-(--yz-rule)" />
                  <span className="yz-tocline__dots" aria-hidden="true" />
                  <Skeleton className="h-3 w-16 rounded-sm bg-(--yz-rule)" />
                </div>
              </div>
            ))}
          </div>
        ) : hasNextPage ? (
          <div className="h-px w-24 bg-(--yz-rule)"></div>
        ) : posts.length > 0 ? (
          <div className="flex items-center gap-4 text-(--yz-ink-faint) mt-4">
            <span className="h-px w-12 bg-current" />
            <span className="yz-hero__pagemark !tracking-[0.3em]">
              {m.posts_end()}
            </span>
            <span className="h-px w-12 bg-current" />
          </div>
        ) : (
          <div className="w-full py-12 text-center text-sm fuwari-text-50">
            {m.posts_no_posts()}
          </div>
        )}
      </div>
    </div>
  );
}
