import { useEffect, useRef } from "react";
import { ArchivePanel } from "../../components/archive/archive-panel";
import type { PostsPageProps } from "@/features/theme/contract/pages";
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="fuwari-onload-animation flex flex-col gap-4">
      {posts.length > 0 && <ArchivePanel posts={posts} />}

      {/* Infinite Scroll trigger and loading indicator */}
      <div
        ref={observerRef}
        className="flex flex-col items-center justify-center pt-2 pb-8"
      >
        {isFetchingNextPage ? (
          <div className="fuwari-card-base w-full px-8 py-6 opacity-70 animate-pulse">
            {/* Inline Mini Skeleton for appending items */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-full rounded-lg flex flex-row justify-start items-center"
              >
                <div className="w-[15%] md:w-[10%] flex justify-end pr-2">
                  <Skeleton className="h-4 w-10 bg-black/10 dark:bg-white/10" />
                </div>
                <div className="w-[15%] md:w-[10%] relative h-full flex items-center before:absolute before:w-1 left-1/2 -ml-0.5 pointer-events-none before:border-l-2 before:border-dashed before:border-black/5 dark:before:border-white/5 before:-top-5 before:bottom-0 before:h-20 z-0">
                  <div className="mx-auto w-2 h-2 rounded-full bg-black/20 dark:bg-white/20 z-10" />
                </div>
                <div className="w-[70%] md:max-w-[65%] md:w-[65%] flex justify-start pl-2">
                  <Skeleton className="h-5 w-3/4 max-w-50 bg-black/10 dark:bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : hasNextPage ? (
          <div className="h-px w-24 bg-black/10 dark:bg-white/10"></div>
        ) : posts.length > 0 ? (
          <div className="flex items-center gap-4 text-black/20 dark:text-white/20 mt-4">
            <span className="h-px w-12 bg-current" />
            <span className="text-sm font-bold italic">到底啦</span>
            <span className="h-px w-12 bg-current" />
          </div>
        ) : (
          <div className="fuwari-card-base w-full px-8 py-12 text-center text-sm fuwari-text-50">
            暂无文章
          </div>
        )}
      </div>
    </div>
  );
}
