import { useEffect, useRef } from "react";
import { m } from "@/paraglide/messages";
import type { MediaAsset } from "../types";
import { MediaTile } from "./media-tile";

export function MediaGrid({
  media,
  onSelect,
  onLoadMore,
  hasMore,
  isLoadingMore,
  showMeta = true,
  selectedKey,
}: {
  media: Array<MediaAsset>;
  onSelect: (asset: MediaAsset) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  showMeta?: boolean;
  selectedKey?: string;
}) {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-start">
        {media.map((asset) => (
          <MediaTile
            key={asset.key}
            asset={asset}
            selected={selectedKey === asset.key}
            showMeta={showMeta}
            onSelect={onSelect}
          />
        ))}
      </div>
      <div
        ref={observerTarget}
        className="h-8 flex items-center justify-center"
      >
        {isLoadingMore ? (
          <span className="text-xs fuwari-text-50">
            {m.media_grid_loading()}
          </span>
        ) : null}
      </div>
    </div>
  );
}
