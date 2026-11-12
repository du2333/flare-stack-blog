import { AdminPage } from "@/components/admin/admin-page";
import {
  FrameActionSkeleton,
  FrameTabsSkeleton,
} from "@/components/admin/frame-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-motion";
import { m } from "@/paraglide/messages";
import { PostListHeader } from "./components/post-row";
import { WIDE_TOOLBAR_QUERY } from "./types";
import "./post-manager.css";

/** The row's cells as placeholders, in the grid and at the height of a real row. */
function PostRowSkeleton({ index }: { index: number }) {
  // Titles of different lengths, so the list does not read as a block.
  const titleWidth = ["w-2/3", "w-1/2", "w-3/4", "w-3/5"][index % 4];
  return (
    <div
      role="row"
      aria-hidden="true"
      className="admin-list-row post-row post-row-skeleton"
    >
      <div className="post-row-title">
        <Skeleton className={`h-4 rounded ${titleWidth}`} />
      </div>
      <div className="post-row-status">
        <Skeleton className="h-(--fuwari-badge-height) w-14 rounded-full" />
      </div>
      <div className="post-row-meta">
        <div className="post-row-taxonomy">
          <Skeleton className="h-3 w-24 rounded" />
        </div>
        <div className="post-row-number post-row-views">
          <Skeleton className="ml-auto h-3 w-8 rounded" />
        </div>
        <div className="post-row-number post-row-comments">
          <Skeleton className="ml-auto h-3 w-6 rounded" />
        </div>
        <div className="post-row-time">
          <Skeleton className="ml-auto h-3 w-14 rounded" />
        </div>
      </div>
      <div className="post-row-actions">
        <Skeleton className="ml-auto size-8 rounded-lg" />
      </div>
    </div>
  );
}

export function PostManagerSkeleton() {
  return (
    <>
      {Array.from({ length: 12 }, (_, index) => (
        <PostRowSkeleton key={index} index={index} />
      ))}
    </>
  );
}

/** The toolbar as it will be: tabs and tools in one row, or in two. */
function PostsToolbarSkeleton() {
  const wide = useMediaQuery(WIDE_TOOLBAR_QUERY);
  const tabs = <FrameTabsSkeleton count={4} className="post-list-tabs" />;
  const tools = (
    <div className="post-list-tools">
      <Skeleton className="post-list-search h-(--fuwari-field-height) rounded-xl" />
      <Skeleton className="h-(--fuwari-field-height) w-24 rounded-xl" />
      {wide ? (
        <Skeleton className="h-(--fuwari-field-height) w-32 rounded-xl" />
      ) : null}
    </div>
  );
  return wide ? (
    <div className="post-list-toolbar-shell">
      <div className="admin-frame-toolbar">
        {tabs}
        {tools}
      </div>
    </div>
  ) : (
    <>
      <div className="admin-frame-toolbar">{tabs}</div>
      {tools}
    </>
  );
}

export function PostManagerPageSkeleton() {
  return (
    <AdminPage
      className="post-manager"
      aria-busy="true"
      title={m.admin_posts_title()}
      count="—"
      actions={<FrameActionSkeleton />}
      toolbar={<PostsToolbarSkeleton />}
      body="list"
      scroll={false}
    >
      <div className="post-list-scroll">
        <div
          className="post-list"
          role="table"
          aria-label={m.admin_posts_title()}
        >
          <PostListHeader
            sortBy="updatedAt"
            viewsSortable={false}
            onSortByChange={() => {}}
          />
          <div role="rowgroup">
            <PostManagerSkeleton />
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
