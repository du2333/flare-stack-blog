import { useEffect, useRef } from "react";
import type { PostsPageProps } from "@/features/theme/contract/pages";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { PostCard } from "../../components/post-card";

export function PostsPage({
  posts,
  tags,
  selectedTag,
  onTagClick,
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
    <div className="cuckoo-onload-animation">
      {/* 标签云筛选(对应原主题侧栏标签 chip) */}
      {tags.length > 0 && (
        <div className="cuckoo-card-base mb-2 flex flex-wrap gap-2 p-3.5">
          <button
            type="button"
            onClick={() => onTagClick(undefined)}
            className={cn(
              "cuckoo-chip",
              !selectedTag && "!bg-(--cuckoo-primary) !text-white shadow-md",
            )}
          >
            {m.posts_all()}
          </button>
          {tags.map((tag) => (
            <button
              key={tag.name}
              type="button"
              onClick={() => onTagClick(tag.name)}
              className={cn(
                "cuckoo-chip",
                selectedTag === tag.name &&
                  "!bg-(--cuckoo-primary) !text-white shadow-md",
              )}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {posts.length > 0 ? (
        posts.map((post) => <PostCard key={post.slug} post={post} />)
      ) : (
        <div className="cuckoo-card-base cuckoo-text-50 my-5 px-8 py-12 text-center text-sm">
          {m.posts_no_posts()}
        </div>
      )}

      {/* 无限滚动触发器 + 加载更多(对应原主题 .changePage) */}
      <div ref={observerRef} className="my-5 text-center">
        {isFetchingNextPage ? (
          <div className="cuckoo-card-base cuckoo-text-50 inline-block w-25 pt-2.5 pb-1 text-sm">
            {m.posts_loading()}
          </div>
        ) : hasNextPage ? (
          <button
            type="button"
            onClick={() => fetchNextPage()}
            className="cuckoo-card-base cuckoo-card-hoverable cuckoo-text-75 inline-block w-25 pt-2.5 pb-1 text-sm transition-all hover:text-(--cuckoo-accent)"
          >
            {m.posts_load_more_cuckoo()}
          </button>
        ) : posts.length > 0 ? (
          <div className="cuckoo-text-30 inline-block text-sm">
            {m.posts_end()}
          </div>
        ) : null}
      </div>
    </div>
  );
}
