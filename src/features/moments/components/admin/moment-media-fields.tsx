import { ChevronLeft, ChevronRight, Clock, Play, X } from "lucide-react";
import type { DragEvent } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FloatingPopover } from "@/components/ui/floating-popover";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { ImageSourcePicker } from "@/features/media/components/media-library/components";
import type { ImageSourceTab } from "@/features/media/components/media-library/components/image-source-picker";
import type { useMediaPicker } from "@/features/media/components/media-library/hooks";
import type { MediaAsset } from "@/features/media/components/media-library/types";
import { getPublicImageSrc } from "@/features/media/utils/media.utils";
import type { MomentImage } from "@/features/moments/schema/moments.schema";
import { momentImageLayout } from "@/features/moments/utils/moment-images";
import { MOMENT_IMAGES_MAX } from "@/features/moments/utils/moment-rules";
import {
  directVideoHost,
  videoProviderName,
} from "@/features/posts/components/content/video-embed";
import type { ResolveDirectVideo } from "@/features/posts/editor/extensions/video/use-direct-video-lookup";
import { VideoEditorPanel } from "@/features/posts/editor/extensions/video/video-editor-panel";
import type {
  DirectVideo,
  VideoSource,
} from "@/features/posts/utils/video-source";
import {
  formatVideoDuration,
  videoCoverUrl,
  videoPageUrl,
  videoThumbnailUrl,
} from "@/features/posts/utils/video-source";
import { orpcClient } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { DraftVideo } from "./moment-draft";

/** A Media item, library or just uploaded, as an image of a Moment. */
export function momentImageOf(asset: MomentImage): MomentImage {
  return {
    key: asset.key,
    url: asset.url,
    width: asset.width,
    height: asset.height,
  };
}

/** A file on its way to becoming one of the draft's images. */
export interface PendingImage {
  id: number;
  /** The file as the browser shows it, for a preview before it is Media. */
  preview: string | null;
  state: "queued" | "uploading";
}

/** Marks a drag of one of the draft's own images; dropped files carry no such type. */
const MOMENT_IMAGE_DRAG_TYPE = "application/x-moment-image";

type Tile =
  | { kind: "image"; key: string; image: MomentImage; index: number }
  | { kind: "pending"; key: string; pending: PendingImage };

const TILE_BUTTON_CLASS =
  "size-6 bg-black/45 text-white hover:bg-black/60 hover:text-white";

/**
 * The draft's images as the public page lays them out, only small: one
 * large, two to four in two columns, five to nine in three. Past nine the
 * ninth carries +N and opens the rest, so every image can still be moved or
 * removed. Files still uploading sit after the images, each with its own
 * state. An image is dragged to where it should be, or moved a place at a
 * time with the buttons on it.
 */
export function MomentImageGrid({
  images,
  pending,
  disabled,
  onRemove,
  onMove,
}: {
  images: ReadonlyArray<MomentImage>;
  pending: ReadonlyArray<PendingImage>;
  disabled: boolean;
  onRemove: (key: string) => void;
  onMove: (from: number, to: number) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  // Which move button had focus, to give it back once the tile has moved.
  const refocus = useRef<{
    key: string;
    direction: "earlier" | "later";
  } | null>(null);

  const tiles: Array<Tile> = [
    ...images.map((image, index): Tile => ({
      kind: "image",
      key: image.key,
      image,
      index,
    })),
    ...pending.map((item): Tile => ({
      kind: "pending",
      key: `pending-${item.id}`,
      pending: item,
    })),
  ];
  const layout = momentImageLayout(tiles.length);
  const expanded = showAll && layout.more > 0;
  const shown = expanded ? tiles : tiles.slice(0, layout.shown);
  const columns = expanded ? 3 : layout.columns;
  const hiddenPending = expanded
    ? 0
    : tiles.slice(layout.shown).filter((tile) => tile.kind === "pending")
        .length;

  useEffect(() => {
    if (layout.more === 0) setShowAll(false);
  }, [layout.more]);

  useLayoutEffect(() => {
    const request = refocus.current;
    if (!request) return;
    refocus.current = null;
    const tile = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>("[data-tile]") ?? [],
    ).find((element) => element.dataset.tile === request.key);
    const move = (direction: string) =>
      tile?.querySelector<HTMLButtonElement>(
        `[data-move="${direction}"]:not(:disabled)`,
      );
    (
      move(request.direction) ??
      move(request.direction === "earlier" ? "later" : "earlier")
    )?.focus();
  });

  const moveBy = (index: number, step: -1 | 1) => {
    const to = index + step;
    refocus.current = {
      key: images[index].key,
      direction: step < 0 ? "earlier" : "later",
    };
    setAnnouncement(m.moment_admin_image_moved({ position: to + 1 }));
    onMove(index, to);
  };

  const endDrag = () => {
    setDragKey(null);
    setOverKey(null);
  };

  const dropOn = (event: DragEvent, target: Tile) => {
    if (dragKey === null) return;
    event.preventDefault();
    const from = images.findIndex((image) => image.key === dragKey);
    if (target.kind === "image" && from >= 0) onMove(from, target.index);
    endDrag();
  };

  const single = columns === 1 && shown.length === 1;

  return (
    <div className="flex flex-col gap-1.5">
      <ul
        ref={listRef}
        className={cn(
          "grid gap-1",
          single
            ? "w-fit max-w-full grid-cols-1"
            : cn("max-w-xs", columns === 2 ? "grid-cols-2" : "grid-cols-3"),
        )}
      >
        {shown.map((tile, position) => {
          const covered =
            !expanded && layout.more > 0 && position === shown.length - 1;
          const isImage = tile.kind === "image";
          const index = isImage ? tile.index : -1;
          const canMove = isImage && images.length > 1 && !disabled && !covered;
          return (
            <li
              key={tile.key}
              data-tile={tile.key}
              draggable={isImage && !disabled && !covered}
              onDragStart={(event) => {
                if (!isImage) return;
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData(MOMENT_IMAGE_DRAG_TYPE, tile.key);
                setDragKey(tile.key);
              }}
              onDragOver={(event) => {
                if (dragKey === null || !isImage) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (overKey !== tile.key) setOverKey(tile.key);
              }}
              onDragLeave={() => {
                if (overKey === tile.key) setOverKey(null);
              }}
              onDrop={(event) => dropOn(event, tile)}
              onDragEnd={endDrag}
              className={cn(
                "group relative overflow-hidden rounded-lg bg-(--fuwari-btn-regular-bg)",
                single
                  ? "rounded-xl"
                  : columns === 2
                    ? "aspect-4/3"
                    : "aspect-square",
                isImage && !disabled && !covered && "cursor-grab",
                dragKey === tile.key && "opacity-40",
                overKey === tile.key &&
                  dragKey !== tile.key &&
                  "ring-2 ring-(--fuwari-primary)",
              )}
            >
              {tile.kind === "image" ? (
                <img
                  src={getPublicImageSrc(tile.image.url, 400)}
                  alt={m.moment_admin_image_alt({ index: index + 1 })}
                  width={single ? (tile.image.width ?? undefined) : undefined}
                  height={single ? (tile.image.height ?? undefined) : undefined}
                  loading="lazy"
                  draggable={false}
                  className={
                    single
                      ? "block h-auto max-h-44 w-auto max-w-full object-contain"
                      : "absolute inset-0 size-full object-cover"
                  }
                />
              ) : (
                <PendingTile pending={tile.pending} single={single} />
              )}
              {covered ? (
                <button
                  type="button"
                  aria-label={m.moment_admin_images_expand({
                    count: tiles.length,
                  })}
                  onClick={() => setShowAll(true)}
                  className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/55 text-lg font-bold text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--fuwari-primary)"
                >
                  +{layout.more}
                  {hiddenPending > 0 ? <Spinner size={14} /> : null}
                </button>
              ) : isImage ? (
                <>
                  <IconButton
                    size="sm"
                    label={m.moment_admin_image_remove({ index: index + 1 })}
                    disabled={disabled}
                    onClick={() => onRemove(tile.image.key)}
                    className={cn("absolute top-1 right-1", TILE_BUTTON_CLASS)}
                  >
                    <X size={14} />
                  </IconButton>
                  {canMove ? (
                    <div className="pointer-coarse:opacity-100 absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                      <IconButton
                        size="sm"
                        data-move="earlier"
                        label={m.moment_admin_image_move_earlier({
                          index: index + 1,
                        })}
                        disabled={index === 0}
                        onClick={() => moveBy(index, -1)}
                        className={TILE_BUTTON_CLASS}
                      >
                        <ChevronLeft size={14} />
                      </IconButton>
                      <IconButton
                        size="sm"
                        data-move="later"
                        label={m.moment_admin_image_move_later({
                          index: index + 1,
                        })}
                        disabled={index === images.length - 1}
                        onClick={() => moveBy(index, 1)}
                        className={TILE_BUTTON_CLASS}
                      >
                        <ChevronRight size={14} />
                      </IconButton>
                    </div>
                  ) : null}
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
      {expanded ? (
        <Button
          size="sm"
          variant="plain"
          className="w-fit"
          onClick={() => setShowAll(false)}
        >
          {m.moment_admin_images_collapse()}
        </Button>
      ) : null}
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}

/** A file not yet Media: its own picture, dimmed, with where its upload is. */
function PendingTile({
  pending,
  single,
}: {
  pending: PendingImage;
  single: boolean;
}) {
  const label =
    pending.state === "uploading"
      ? m.moment_admin_image_uploading()
      : m.moment_admin_image_queued();
  return (
    <div
      role="status"
      aria-label={label}
      title={label}
      className={cn("relative", single ? "size-28" : "size-full")}
    >
      {pending.preview ? (
        <img
          src={pending.preview}
          alt=""
          draggable={false}
          className="absolute inset-0 size-full object-cover opacity-50"
        />
      ) : null}
      <span className="absolute inset-0 flex items-center justify-center text-(--fuwari-primary)">
        {pending.state === "uploading" ? (
          <Spinner size={20} />
        ) : (
          <Clock size={18} aria-hidden="true" />
        )}
      </span>
    </div>
  );
}

/**
 * Upload, import or pick images from an icon's popover. Choosing files or
 * importing a link closes it; the library stays open for picking several.
 */
export function MomentImagePopover({
  open,
  anchor,
  library,
  full,
  onFiles,
  onSelect,
  onClose,
}: {
  open: boolean;
  anchor: HTMLElement | null;
  library: ReturnType<typeof useMediaPicker>;
  /** The draft holds as many images as a Moment shows. */
  full: boolean;
  onFiles: (files: Array<File>) => void;
  onSelect: (asset: MediaAsset) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<ImageSourceTab>("upload");
  const tabsRef = useRef<HTMLDivElement>(null);
  return (
    <FloatingPopover
      open={open}
      anchor={anchor}
      onDismiss={onClose}
      returnFocusOnEscape
      initialFocus={() =>
        tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]') ??
        null
      }
      role="dialog"
      aria-label={m.moment_admin_add_images()}
      className="flex w-96 max-w-[calc(100vw-1rem)] flex-col gap-2 p-2"
    >
      <ImageSourcePicker
        tabsRef={tabsRef}
        tab={tab}
        onTabChange={setTab}
        library={library}
        uploading={full}
        multiple
        onFiles={(files) => {
          onFiles(files);
          onClose();
        }}
        onSelect={(asset) => {
          onSelect(asset);
          if (tab !== "library") onClose();
        }}
      />
      {full ? (
        <p className="px-1 text-xs fuwari-text-50">
          {m.moment_admin_images_full({ limit: MOMENT_IMAGES_MAX })}
        </p>
      ) : null}
    </FloatingPopover>
  );
}

/** Looks an address up on the server, as the post editor's video block does. */
const resolveDirectVideo: ResolveDirectVideo = (url) =>
  orpcClient.posts.admin.directVideo({ url });

/** What a compact video card shows of a video. */
function videoCardOf(video: DraftVideo) {
  if (video.kind === "provider") {
    const { source, meta } = video;
    const provider =
      videoProviderName(source.provider) +
      (source.page ? ` · P${source.page}` : "");
    return {
      thumbnail: meta.cover
        ? videoCoverUrl(meta.cover, 480)
        : videoThumbnailUrl(source),
      title: meta.title ?? videoPageUrl(source),
      subtitle: provider,
      duration: meta.duration,
    };
  }
  const { video: direct } = video;
  return {
    thumbnail: direct.cover,
    title: direct.title ?? direct.pageUrl ?? direct.src,
    subtitle: directVideoHost(direct),
    duration: direct.duration,
  };
}

/**
 * The draft's video as a compact card: its still, title, where it is from and
 * its length, with a button that removes it. Changing it is the video icon's.
 */
export function MomentVideoCard({
  video,
  disabled,
  onRemove,
}: {
  video: DraftVideo;
  disabled: boolean;
  onRemove: () => void;
}) {
  const card = videoCardOf(video);
  return (
    <div className="flex max-w-sm items-center gap-3 rounded-xl p-2 ring-1 ring-(--fuwari-input-border)">
      <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-800 text-white">
        {card.thumbnail ? (
          <img
            src={card.thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 bg-linear-to-br from-(--fuwari-primary)/40 via-neutral-800 to-neutral-900" />
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-7 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
            <Play size={12} fill="currentColor" strokeWidth={0} />
          </span>
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium fuwari-text-90">
          {card.title}
        </span>
        <span className="truncate text-xs fuwari-text-50">
          {card.subtitle}
          {card.duration ? ` · ${formatVideoDuration(card.duration)}` : ""}
        </span>
      </div>
      <IconButton
        label={m.moment_admin_video_remove()}
        disabled={disabled}
        onClick={onRemove}
      >
        <X size={16} />
      </IconButton>
    </div>
  );
}

/**
 * The post editor's video panel, outside the editor and in a popover: a
 * Bilibili or YouTube link, or a Direct Video looked up on the server, whose
 * length the panel reads from the file.
 */
export function MomentVideoPopover({
  open,
  anchor,
  video,
  onApply,
  onApplyDirect,
  onClose,
}: {
  open: boolean;
  anchor: HTMLElement | null;
  /** The video being changed, if there is one. */
  video: DraftVideo | null;
  onApply: (source: VideoSource) => void;
  onApplyDirect: (video: DirectVideo) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const direct = video?.kind === "direct" ? video.video : null;
  const link =
    video?.kind === "provider"
      ? videoPageUrl(video.source)
      : direct
        ? (direct.pageUrl ?? direct.src)
        : "";

  return (
    <FloatingPopover
      open={open}
      anchor={anchor}
      onDismiss={onClose}
      returnFocusOnEscape
      initialFocus={() => inputRef.current}
      role="dialog"
      aria-label={m.moment_admin_add_video()}
      className="w-96 max-w-[calc(100vw-1rem)] p-3"
    >
      <VideoEditorPanel
        link={link}
        direct={direct}
        inserted={video === null}
        applyLabel={
          video === null
            ? m.moment_admin_video_add()
            : m.moment_admin_video_update()
        }
        resolveDirectVideo={resolveDirectVideo}
        inputRef={inputRef}
        onApply={onApply}
        onApplyDirect={onApplyDirect}
        onCancel={onClose}
      />
    </FloatingPopover>
  );
}
