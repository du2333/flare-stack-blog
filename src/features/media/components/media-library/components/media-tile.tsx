import { useState } from "react";
import { cn, formatBytes } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { mediaUsageOf } from "@/features/media/utils/media.utils";
import { m } from "@/paraglide/messages";
import { usageCount } from "../media-usage";
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
  const usage = mediaUsageOf(asset);
  const unused = usage === "none";

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
        {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
        <img
          src={asset.url}
          alt={asset.fileName}
          className={cn(
            "h-full w-full object-cover",
            loaded ? "opacity-100" : "opacity-0",
          )}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
        {unused ? (
          <Badge tone="warning" size="sm" className="absolute top-2 left-2">
            {m.media_badge_unused()}
          </Badge>
        ) : asset.isCover ? (
          <Badge tone="primary" size="sm" className="absolute top-2 left-2">
            {m.media_badge_cover()}
          </Badge>
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
              <span>
                {usage === "current"
                  ? usageCount(asset)
                  : m.media_badge_revisions()}
              </span>
            )}
            <span>{formatBytes(asset.sizeInBytes)}</span>
          </div>
        ) : null}
      </div>
    </button>
  );
}
