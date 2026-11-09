import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ImageSourcePicker } from "@/features/media/components/media-library/components";
import type { useMediaPicker } from "@/features/media/components/media-library/hooks";
import type { MediaAsset } from "@/features/media/components/media-library/types";
import type { MomentImage } from "@/features/moments/schema/moments.schema";
import { MOMENT_IMAGES_MAX } from "@/features/moments/utils/moment-rules";
import {
  DirectVideoPoster,
  VideoPoster,
} from "@/features/posts/components/content/video-embed";
import { VideoEditorPanel } from "@/features/posts/editor/extensions/video/video-editor-panel";
import type { ResolveDirectVideo } from "@/features/posts/editor/extensions/video/use-direct-video-lookup";
import type {
  DirectVideo,
  VideoSource,
} from "@/features/posts/utils/video-source";
import { videoPageUrl } from "@/features/posts/utils/video-source";
import { orpcClient } from "@/lib/orpc";
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

/** The images of the draft, in order, each with a button that removes it. */
export function MomentImageThumbs({
  images,
  disabled,
  onRemove,
}: {
  images: ReadonlyArray<MomentImage>;
  disabled: boolean;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs fuwari-text-50">
        {m.moment_admin_images_count({
          count: images.length,
          limit: MOMENT_IMAGES_MAX,
        })}
      </p>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {images.map((image, index) => (
          <li
            key={image.key}
            className="relative aspect-square overflow-hidden rounded-lg bg-(--fuwari-btn-regular-bg)"
          >
            <img
              src={image.url}
              alt={m.moment_admin_image_alt({ index: index + 1 })}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <IconButton
              size="sm"
              label={m.moment_admin_image_remove({ index: index + 1 })}
              disabled={disabled}
              onClick={() => onRemove(image.key)}
              className="absolute top-1 right-1 size-6 bg-black/45 text-white hover:bg-black/60 hover:text-white"
            >
              <X size={14} />
            </IconButton>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Upload, import or pick images, which are added to the draft as they arrive. */
export function MomentImagePanel({
  library,
  uploading,
  full,
  onFiles,
  onSelect,
  onClose,
}: {
  library: ReturnType<typeof useMediaPicker>;
  uploading: boolean;
  /** The draft holds as many images as a Moment shows. */
  full: boolean;
  onFiles: (files: Array<File>) => void;
  onSelect: (asset: MediaAsset) => void;
  onClose: () => void;
}) {
  return (
    <div
      role="group"
      aria-label={m.moment_admin_add_images()}
      className="flex flex-col gap-2 rounded-xl p-3 ring-1 ring-(--fuwari-input-border)"
    >
      <ImageSourcePicker
        library={library}
        uploading={uploading || full}
        multiple
        onFiles={onFiles}
        onSelect={onSelect}
      />
      <div className="flex items-center gap-2">
        <p className="mr-auto text-xs fuwari-text-50">
          {full
            ? m.moment_admin_images_full({ limit: MOMENT_IMAGES_MAX })
            : null}
        </p>
        <Button size="sm" onClick={onClose}>
          {m.moment_admin_panel_done()}
        </Button>
      </div>
    </div>
  );
}

/** Looks an address up on the server, as the post editor's video block does. */
const resolveDirectVideo: ResolveDirectVideo = (url) =>
  orpcClient.posts.admin.directVideo({ url });

/** The poster of the draft's video, with buttons to change or remove it. */
export function MomentVideoPreview({
  video,
  disabled,
  onChange,
  onRemove,
}: {
  video: DraftVideo;
  disabled: boolean;
  onChange: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-full max-w-xs">
        {video.kind === "provider" ? (
          <VideoPoster source={video.source} meta={video.meta} />
        ) : (
          <DirectVideoPoster video={video.video} />
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Button size="sm" disabled={disabled} onClick={onChange}>
          {m.moment_admin_video_change()}
        </Button>
        <IconButton
          label={m.moment_admin_video_remove()}
          disabled={disabled}
          onClick={onRemove}
        >
          <X size={16} />
        </IconButton>
      </div>
    </div>
  );
}

/**
 * The post editor's video panel, outside the editor: a Bilibili or YouTube
 * link, or a Direct Video looked up on the server, whose length the panel
 * reads from the file.
 */
export function MomentVideoPanel({
  video,
  onApply,
  onApplyDirect,
  onCancel,
}: {
  /** The video being changed, if there is one. */
  video: DraftVideo | null;
  onApply: (source: VideoSource) => void;
  onApplyDirect: (video: DirectVideo) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const direct = video?.kind === "direct" ? video.video : null;
  const link =
    video?.kind === "provider"
      ? videoPageUrl(video.source)
      : direct
        ? (direct.pageUrl ?? direct.src)
        : "";

  return (
    <div
      role="group"
      aria-label={m.moment_admin_add_video()}
      className="rounded-xl p-3 ring-1 ring-(--fuwari-input-border)"
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
        onCancel={onCancel}
      />
    </div>
  );
}
