import { Button } from "@/components/ui/button";
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
  return (
    <div
      className="fuwari-onload-animation flex flex-col gap-4"
      style={{ animationDelay: "var(--fuwari-content-delay)" }}
    >
      {posts.length > 0 && <ArchivePanel posts={posts} />}

      {/* The next posts load on request, so the footer stays in reach. */}
      <div className="flex flex-col items-center justify-center gap-4 pt-2 pb-8">
        {isFetchingNextPage ? (
          <div className="fuwari-card-base fuwari-card-panel w-full px-[var(--theme-panel-pad-x,2rem)] py-6 opacity-70">
            {Array.from({ length: 3 }).map((_, i) => (
              <ArchivePostSkeleton key={i} />
            ))}
          </div>
        ) : null}
        {hasNextPage ? (
          <Button
            size="lg"
            onClick={() => fetchNextPage()}
            loading={isFetchingNextPage}
          >
            {m.posts_load_more()}
          </Button>
        ) : posts.length > 0 ? (
          <div className="flex items-center gap-4 text-(--theme-rule,var(--fuwari-meta-divider)) mt-4">
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
