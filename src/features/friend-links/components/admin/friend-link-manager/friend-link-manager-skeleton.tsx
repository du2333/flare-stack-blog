import { AdminPage } from "@/components/admin/admin-page";
import {
  FrameActionSkeleton,
  FrameTabsSkeleton,
} from "@/components/admin/frame-skeleton";
import { m } from "@/paraglide/messages";
import { FriendLinkReviewSkeleton } from "./friend-link-review";
import "./friend-link-manager.css";

export function FriendLinkManagerPageSkeleton() {
  return (
    <AdminPage
      className="friend-workspace"
      aria-hidden="true"
      title={m.friend_links_admin_title()}
      actions={<FrameActionSkeleton />}
      tabs={<FrameTabsSkeleton count={3} />}
      body="split"
      inset={false}
    >
      <FriendLinkReviewSkeleton />
    </AdminPage>
  );
}
