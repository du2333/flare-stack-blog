import {
  FrameHeaderSkeleton,
  FrameTabsSkeleton,
} from "@/components/admin/frame-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-motion";
import { m } from "@/paraglide/messages";
import { WIDE_TOOLBAR_QUERY } from "./types";
import "./post-manager.css";

function PostRowSkeleton() {
  return (
    <tr aria-hidden="true">
      <td colSpan={4}>
        <div className="flex items-center gap-8 py-2">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="hidden sm:block h-4 w-24 rounded" />
        </div>
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
    <div className="admin-frame-toolbar">
      {tabs}
      {tools}
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
        <thead aria-hidden="true">
          <tr>
            <th colSpan={4}>
              <Skeleton className="h-3 w-12 rounded" />
            </th>
          </tr>
        </thead>
        <tbody>
          <PostManagerSkeleton />
        </tbody>
      </table>
    </div>
  );
}
