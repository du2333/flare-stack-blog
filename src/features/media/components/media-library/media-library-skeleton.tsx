import {
  FrameHeaderSkeleton,
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
    <div className="media-workspace admin-workspace admin-frame fuwari-card-base">
      <FrameHeaderSkeleton title={m.media_title()} />
      <div className="media-workspace-toolbar admin-frame-toolbar">
        <FrameTabsSkeleton count={2} className="media-workspace-tabs" />
      </div>
      <MediaCollectionSkeleton />
    </div>
  );
}
