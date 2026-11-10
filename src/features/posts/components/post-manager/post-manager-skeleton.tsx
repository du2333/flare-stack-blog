import {
  FrameHeaderSkeleton,
  FrameTabsSkeleton,
} from "@/components/admin/frame-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-motion";
import { m } from "@/paraglide/messages";
import { PostListColgroup } from "./components/post-row";
import { WIDE_TOOLBAR_QUERY } from "./types";
import "./post-manager.css";

function PostRowSkeleton() {
  return (
    <tr aria-hidden="true">
      <td>
        <div className="post-list-title-line">
          <Skeleton className="h-4 w-2/3 rounded" />
          <Skeleton className="h-(--fuwari-badge-height) w-14 shrink-0 rounded-full" />
        </div>
        <div className="post-list-meta-line">
          <Skeleton className="h-3 w-1/4 rounded" />
        </div>
      </td>
      <td className="post-list-date">
        <Skeleton className="ml-auto h-3 w-16 rounded" />
      </td>
      <td className="post-list-actions">
        <Skeleton className="ml-auto size-8 rounded-lg max-[620px]:size-11" />
      </td>
    </tr>
  );
}

export function PostManagerSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((id) => (
        <PostRowSkeleton key={id} />
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
    <div
      className="post-manager admin-workspace admin-frame fuwari-card-base"
      aria-busy="true"
    >
      <FrameHeaderSkeleton title={m.admin_posts_title()} />
      <PostsToolbarSkeleton />
      <table className="post-list-table">
        <PostListColgroup />
        <thead aria-hidden="true">
          <tr>
            <th>
              <Skeleton className="h-3 w-12 rounded" />
            </th>
            <th>
              <Skeleton className="ml-auto h-3 w-16 rounded" />
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          <PostManagerSkeleton />
        </tbody>
      </table>
    </div>
  );
}
