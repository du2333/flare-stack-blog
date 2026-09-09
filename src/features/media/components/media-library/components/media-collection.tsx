import { ImageOff } from "lucide-react";
import { useRef, useState } from "react";
import { getOptimizedImageUrl } from "@/features/media/utils/media.utils";
import { formatBytes } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useMediaGridMotion } from "../hooks/use-media-grid-motion";
import type { MediaAsset } from "../types";
import type { MediaView } from "./media-toolbar";

export function MediaThumbnail({ asset }: { asset: MediaAsset }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="media-thumbnail">
      {failed ? (
        <ImageOff size={24} aria-label={m.media_image_unavailable()} />
      ) : (
        <img
          src={getOptimizedImageUrl(asset.key, 480)}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

export function MediaCollection({
  items,
  view,
  selectedKey,
  onSelect,
}: {
  items: Array<MediaAsset>;
  view: MediaView;
  selectedKey?: string;
  onSelect: (asset: MediaAsset, trigger: HTMLButtonElement) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  useMediaGridMotion(
    gridRef,
    `${view}:${items.map((item) => item.key).join(",")}`,
  );
  const usage = (asset: MediaAsset) =>
    asset.postCount
      ? m.media_post_count({ count: asset.postCount })
      : m.media_unreferenced();
  if (view === "list")
    return (
      <div className="media-table-scroll">
        <table className="media-table">
          <thead>
            <tr>
              <th>{m.media_col_image()}</th>
              <th>{m.media_col_dimensions()}</th>
              <th>{m.media_preview_size()}</th>
              <th>{m.media_col_usage()}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((asset) => (
              <tr key={asset.key} data-selected={asset.key === selectedKey}>
                <td>
                  <button
                    type="button"
                    className="media-file"
                    aria-pressed={asset.key === selectedKey}
                    onClick={(event) => onSelect(asset, event.currentTarget)}
                  >
                    <MediaThumbnail asset={asset} />
                    <span title={asset.fileName}>{asset.fileName}</span>
                  </button>
                </td>
                <td>
                  {asset.width && asset.height
                    ? `${asset.width} × ${asset.height}`
                    : "—"}
                </td>
                <td>{formatBytes(asset.sizeInBytes)}</td>
                <td>{usage(asset)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <div className="media-gallery" ref={gridRef}>
      {items.map((asset) => (
        <button
          key={asset.key}
          type="button"
          className="media-gallery-item"
          aria-pressed={asset.key === selectedKey}
          onClick={(event) => onSelect(asset, event.currentTarget)}
        >
          <MediaThumbnail asset={asset} />
          <span className="media-gallery-name" title={asset.fileName}>
            {asset.fileName}
          </span>
          <span className="media-gallery-meta">
            {usage(asset)}
            <span>·</span>
            {formatBytes(asset.sizeInBytes)}
          </span>
        </button>
      ))}
    </div>
  );
}
