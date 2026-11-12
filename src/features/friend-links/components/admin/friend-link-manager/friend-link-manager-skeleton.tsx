import { AdminPage } from "@/components/admin/admin-page";
import {
  FrameActionSkeleton,
  FrameTabsSkeleton,
} from "@/components/admin/frame-skeleton";
import { Skeleton, SkeletonListRows } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";
import "./friend-link-manager.css";
export function FriendLinkManagerSkeleton() {
  return (
    <SkeletonListRows
      count={5}
      avatar="square"
      lines={["h-5 w-1/3", "h-4 w-2/3", "h-3 w-1/2"]}
    />
  );
}

export function FriendLinkManagerPageSkeleton() {
  return (
    <AdminPage
      className="friend-workspace"
      aria-hidden="true"
      title={m.friend_links_admin_title()}
      description={m.friend_review_hint()}
      actions={<FrameActionSkeleton />}
      tabs={<FrameTabsSkeleton count={3} />}
      body="split"
    >
      <div className="friend-body admin-frame-bleed">
        <div className="friend-queue">
          <Skeleton className="friend-search h-(--fuwari-field-height) rounded-xl" />
          <div className="friend-queue-scroll">
            <FriendLinkManagerSkeleton />
          </div>
        </div>
        <div className="friend-detail">
          <div className="friend-detail-placeholder">
            <FriendLinkManagerSkeleton />
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
