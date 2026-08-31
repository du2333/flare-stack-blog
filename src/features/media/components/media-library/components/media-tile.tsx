import { useState } from "react";
import { getOptimizedImageUrl } from "@/features/media/utils/media.utils";
import { cn, formatBytes } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { MediaAsset } from "../types";

export function MediaTile({
  asset,
  selected = false,
  showMeta = true,
  onSelect,
}: {
  asset: MediaAsset;
  selected?: boolean;
  showMeta?: boolean;
  onSelect: (asset: MediaAsset) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const unused = asset.postCount === 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(asset)}
      className="group flex flex-col gap-2 min-w-0 text-left"
    >
      <div
        className={cn(
          "relative aspect-square overflow-hidden rounded-xl bg-(--fuwari-btn-regular-bg)",
          selected && "ring-2 ring-(--fuwari-primary)",
          unused && "ring-2 ring-(--fuwari-warning)",
        )}
      >
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-(--fuwari-btn-regular-bg)" />
        )}
        <img
          src={getOptimizedImageUrl(asset.key, 480)}
          alt={asset.fileName}
          className={cn(
            "h-full w-full object-cover",
            loaded ? "opacity-100" : "opacity-0",
          )}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
        {unused ? (
          <span className="absolute top-2 left-2 h-6 px-2 rounded-full text-[11px] font-medium bg-(--fuwari-warning-bg) text-(--fuwari-warning-fg) grid place-items-center">
            {m.media_badge_unused()}
          </span>
        ) : asset.isCover ? (
          <span className="absolute top-2 left-2 h-6 px-2 rounded-full text-[11px] font-medium bg-(--fuwari-primary) text-white grid place-items-center">
            {m.media_badge_cover()}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 px-0.5">
        <div className="text-sm truncate fuwari-text-90">{asset.fileName}</div>
        {showMeta ? (
          <div className="mt-0.5 flex justify-between gap-2 text-xs fuwari-text-50">
            {unused ? (
              <span className="text-(--fuwari-warning-fg)">
                {m.media_badge_unused()}
              </span>
            ) : (
              <span>{m.media_post_count({ count: asset.postCount })}</span>
            )}
            <span>{formatBytes(asset.sizeInBytes)}</span>
          </div>
        ) : null}
      </div>
    </button>
  );
}
