import type { MediaView } from "./components/media-toolbar";
import "./media-library.css";

export function MediaCollectionSkeleton({
  view = "grid",
}: {
  view?: MediaView;
}) {
  return (
    <div
      className={
        view === "grid"
          ? "media-gallery animate-pulse"
          : "media-list-skeleton animate-pulse"
      }
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index}>
          <div className="media-skeleton-image" />
          <div className="media-skeleton-label" />
        </div>
      ))}
    </div>
  );
}

export function MediaLibraryPageSkeleton() {
  return (
    <div className="media-workspace fuwari-card-base animate-pulse">
      <div className="media-workspace-header">
        <div className="media-skeleton-label" />
      </div>
      <div className="media-workspace-toolbar" />
      <MediaCollectionSkeleton />
    </div>
  );
}
