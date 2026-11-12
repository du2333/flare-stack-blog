import { AdminPage } from "@/components/admin/admin-page";
import {
  FrameActionSkeleton,
  FrameTabsSkeleton,
} from "@/components/admin/frame-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";
import type { MediaView } from "./components/media-toolbar";
import "./media-library.css";

export function MediaCollectionSkeleton({
  view = "grid",
}: {
  view?: MediaView;
}) {
  return (
    <div className={view === "grid" ? "media-gallery" : "media-list-skeleton"}>
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index}>
          <Skeleton className="media-skeleton-image" />
          <Skeleton className="media-skeleton-label" />
        </div>
      ))}
    </div>
  );
}

export function MediaLibraryPageSkeleton() {
  return (
    <AdminPage
      className="media-workspace"
      title={m.media_title()}
      count="—"
      actions={<FrameActionSkeleton />}
      toolbar={
        <div className="media-toolbar-shell">
          <div className="media-workspace-toolbar admin-frame-toolbar">
            <FrameTabsSkeleton count={2} className="media-workspace-tabs" />
          </div>
        </div>
      }
      body="list"
      scroll={false}
    >
      <MediaCollectionSkeleton />
    </AdminPage>
  );
}
