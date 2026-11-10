import {
  FrameHeaderSkeleton,
  FrameTabsSkeleton,
} from "@/components/admin/frame-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";
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

export function PostManagerPageSkeleton() {
  return (
    <div
      className="post-manager admin-workspace admin-frame fuwari-card-base"
      aria-busy="true"
    >
      <FrameHeaderSkeleton title={m.admin_posts_title()} />
      <FrameTabsSkeleton count={4} />
      <div className="post-list-controls">
        <Skeleton className="h-11 w-80" />
      </div>
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
