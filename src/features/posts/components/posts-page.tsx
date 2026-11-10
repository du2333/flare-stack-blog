import { useEffect, useRef } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import type { TagWithCount } from "@/features/tags/tags.schema";
import { m } from "@/paraglide/messages";
import { ArchivePanel } from "./archive/archive-panel";
import { ArchivePostSkeleton } from "./archive/archive-post";

export const POSTS_PER_PAGE = 24;

interface PostsPageProps {
  posts: Array<PostItem>;
  tags: Array<Omit<TagWithCount, "createdAt">>;
  selectedTag?: string;
  onTagClick: (tag?: string) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

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
    <div
      className="fuwari-onload-animation flex flex-col gap-4"
      style={{ animationDelay: "var(--fuwari-content-delay)" }}
    >
      {posts.length > 0 && <ArchivePanel posts={posts} />}

      {/* Infinite Scroll trigger and loading indicator */}
      <div
        ref={observerRef}
        className="flex flex-col items-center justify-center pt-2 pb-8"
      >
        {isFetchingNextPage ? (
          <div className="fuwari-card-base fuwari-card-panel w-full px-[var(--theme-panel-pad-x,2rem)] py-6 opacity-70">
            {/* Inline Mini Skeleton for appending items */}
            {Array.from({ length: 3 }).map((_, i) => (
              <ArchivePostSkeleton key={i} />
            ))}
          </div>
        ) : hasNextPage ? (
          <div className="h-px w-24 bg-black/10 dark:bg-white/10"></div>
        ) : posts.length > 0 ? (
          <div className="flex items-center gap-4 text-black/20 dark:text-white/20 mt-4">
            <span className="h-px w-12 bg-current" />
            <span className="text-sm font-bold italic">{m.posts_end()}</span>
            <span className="h-px w-12 bg-current" />
          </div>
        ) : (
          <EmptyState
            size="compact"
            className="fuwari-card-base fuwari-card-panel w-full py-12"
            description={m.posts_no_posts()}
          />
        )}
      </div>
    </div>
  );
}
