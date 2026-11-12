import type { CSSProperties } from "react";
import { AdminPage } from "@/components/admin/admin-page";
import {
  FrameActionSkeleton,
  FrameTabsSkeleton,
} from "@/components/admin/frame-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";
import type { MediaView } from "./components/media-toolbar";
import "./media-library.css";

/** Tile shapes for the loading wall, so it looks like photographs, not a grid. */
const SKELETON_RATIOS = [
  1.5, 1, 1.78, 0.75, 1.33, 1.6, 1, 1.5, 1.33, 0.8, 1.78, 1.2,
];

export function MediaCollectionSkeleton({
  view = "grid",
}: {
  view?: MediaView;
}) {
  if (view === "grid")
    return (
      <div className="media-gallery" aria-hidden="true">
        {SKELETON_RATIOS.map((ratio, index) => (
          <Skeleton
            key={index}
            shimmer
            className="media-gallery-item"
            style={{ "--media-ratio": ratio } as CSSProperties}
          />
        ))}
      </div>
    );
  return (
    <div className="media-list-skeleton" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index}>
          <Skeleton shimmer className="media-skeleton-image" />
          <Skeleton shimmer className="media-skeleton-label" />
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
      tabs={<FrameTabsSkeleton count={2} />}
      body="list"
      scroll={false}
      inset={false}
    >
      <div className="media-workspace-body">
        <div className="media-browser">
          <MediaCollectionSkeleton />
        </div>
      </div>
    </AdminPage>
  );
}
