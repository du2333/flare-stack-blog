import { PostCard } from "../../components/post-card";
import type { PostsPageProps } from "@/features/theme/contract/pages";

export function PostsPage({
  posts,
  tags,
  selectedTag,
  onTagClick,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: PostsPageProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="cuckoo-card p-6 md:p-8 cuckoo-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold cuckoo-text-primary mb-2">
          全部文章
        </h1>
        <p className="cuckoo-text-secondary">共 {posts.length} 篇文章</p>
      </div>

      {/* Tags Filter */}
      {tags.length > 0 && (
        <div className="cuckoo-card p-4 cuckoo-fade-in">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onTagClick("")}
              className={`cuckoo-tag ${!selectedTag ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700" : ""}`}
            >
              全部
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => onTagClick(tag.name)}
                className={`cuckoo-tag ${selectedTag === tag.name ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700" : ""}`}
              >
                {tag.name}
                <span className="ml-1 opacity-60">({tag.postCount})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {posts.map((post, index) => (
          <div
            key={post.id}
            className="cuckoo-slide-up"
            style={{
              animationDelay: `${index * 50}ms`,
              animationFillMode: "both",
            }}
          >
            <PostCard post={post} />
          </div>
        ))}
      </div>

      {/* Load More */}
      {hasNextPage && (
        <div className="text-center pt-4">
          <button
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
            className="cuckoo-btn cuckoo-btn-secondary px-8 py-3"
          >
            {isFetchingNextPage ? "加载中..." : "加载更多"}
          </button>
        </div>
      )}

      {/* End of List */}
      {!hasNextPage && posts.length > 0 && (
        <div className="text-center pt-4 cuckoo-text-muted text-sm">
          已经到底啦～
        </div>
      )}
    </div>
  );
}
