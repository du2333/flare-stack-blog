import {
  FrameHeaderSkeleton,
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
    <div
      className="friend-workspace admin-workspace admin-frame fuwari-card-base"
      aria-hidden="true"
    >
      <FrameHeaderSkeleton
        title={m.friend_links_admin_title()}
        description={m.friend_review_hint()}
      />
      <FrameTabsSkeleton count={3} />
      <div className="friend-body admin-frame-bleed">
        <div className="friend-queue">
          <Skeleton className="friend-search h-(--fuwari-field-height) rounded-xl" />
          <FriendLinkManagerSkeleton />
        </div>
        <div className="friend-detail">
          <div className="friend-detail-placeholder">
            <FriendLinkManagerSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
