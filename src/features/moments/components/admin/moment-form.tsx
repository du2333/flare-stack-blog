import { ImagePlus, Video } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusText } from "@/components/ui/status-text";
import { Textarea } from "@/components/ui/input";
import {
  useMediaPicker,
  useMediaUpload,
} from "@/features/media/components/media-library/hooks";
import type { MediaAsset } from "@/features/media/components/media-library/types";
import type { MomentImage } from "@/features/moments/schema/moments.schema";
import {
  MOMENT_IMAGES_MAX,
  MOMENT_TEXT_MAX_LENGTH,
} from "@/features/moments/utils/moment-rules";
import { EMPTY_VIDEO_META } from "@/features/posts/utils/video-source";
import type {
  DirectVideo,
  VideoSource,
} from "@/features/posts/utils/video-source";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { MomentDraft } from "./moment-draft";
import { draftProblem, draftTextLength, updateInputOf } from "./moment-draft";
import {
  MomentImagePanel,
  MomentImageThumbs,
  MomentVideoPanel,
  MomentVideoPreview,
  momentImageOf,
} from "./moment-media-fields";

type Panel = "images" | "video" | null;

/**
 * The form of a Moment, for a new one and for editing one: text with a live
 * count, then either up to 50 images or one video, never both. Its draft is
 * its own; `onSubmit` gets the draft once it can be posted. Post stays off
 * while the draft is empty or invalid, while images upload and, with
 * `requireChange`, until something differs from `initial`.
 */
export function MomentForm({
  initial,
  submitLabel,
  submitting,
  requireChange = false,
  locked = false,
  error,
  notice,
  onSubmit,
  onCancel,
}: {
  initial: MomentDraft;
  submitLabel: string;
  submitting: boolean;
  requireChange?: boolean;
  /** Keeps Post off for a reason the notice explains. */
  locked?: boolean;
  /** Why the last attempt failed, shown beside the buttons. */
  error?: string | null;
  /** Shown above the buttons, such as an Edit Conflict. */
  notice?: ReactNode;
  onSubmit: (draft: MomentDraft) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraftState] = useState(initial);
  // Uploads and imports land after the render that started them.
  const latest = useRef(draft);
  const [panel, setPanel] = useState<Panel>(null);
  const library = useMediaPicker(panel === "images");
  const { uploadFiles, isUploading } = useMediaUpload();

  const setDraft = (next: MomentDraft) => {
    latest.current = next;
    setDraftState(next);
  };

  const addImages = (assets: ReadonlyArray<MomentImage>) => {
    const current = latest.current.images;
    const keys = new Set(current.map((image) => image.key));
    const fresh = assets.filter((asset) => {
      if (keys.has(asset.key)) return false;
      keys.add(asset.key);
      return true;
    });
    if (fresh.length < assets.length) {
      toast.info(m.moment_admin_image_duplicate());
    }
    const room = MOMENT_IMAGES_MAX - current.length;
    if (fresh.length > room) {
      toast.warning(
        m.moment_admin_images_truncated({ limit: MOMENT_IMAGES_MAX }),
      );
    }
    if (fresh.length === 0 || room <= 0) return;
    setDraft({
      ...latest.current,
      images: [...current, ...fresh.slice(0, room)],
    });
  };

  const uploadImages = async (files: Array<File>) => {
    // Files past the limit are not uploaded only to be left out.
    const room = MOMENT_IMAGES_MAX - latest.current.images.length;
    if (files.length > room) {
      toast.warning(
        m.moment_admin_images_truncated({ limit: MOMENT_IMAGES_MAX }),
      );
    }
    const uploaded = await uploadFiles(files.slice(0, Math.max(room, 0)));
    addImages(uploaded.map(momentImageOf));
  };

  const pickImage = (asset: MediaAsset) => addImages([momentImageOf(asset)]);

  const applyVideo = (video: MomentDraft["video"]) => {
    setDraft({ ...latest.current, video });
    setPanel(null);
  };
  const applyProvider = (source: VideoSource) =>
    applyVideo({ kind: "provider", source, meta: EMPTY_VIDEO_META });
  const applyDirect = (video: DirectVideo) =>
    applyVideo({ kind: "direct", video });

  const length = draftTextLength(draft);
  const problem = draftProblem(draft);
  const changed = !requireChange || updateInputOf(initial, draft) !== null;
  const canSubmit =
    problem === null && changed && !locked && !isUploading && !submitting;
  const hasImages = draft.images.length > 0;
  const hasVideo = draft.video !== null;

  const submit = () => {
    if (canSubmit) onSubmit(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  };

  const textError =
    problem === "text_too_long"
      ? m.moment_admin_text_too_long({
          over: length - MOMENT_TEXT_MAX_LENGTH,
        })
      : problem === "text_invalid"
        ? m.moment_admin_text_invalid()
        : null;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-col gap-1">
        <Textarea
          rows={4}
          value={draft.text}
          disabled={submitting}
          aria-label={m.moment_admin_text_label()}
          aria-invalid={textError ? true : undefined}
          placeholder={m.moment_admin_text_placeholder()}
          onChange={(event) =>
            setDraft({ ...latest.current, text: event.target.value })
          }
          onKeyDown={onKeyDown}
        />
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="min-w-0">
            {textError ? (
              <StatusText error className="text-xs">
                {textError}
              </StatusText>
            ) : null}
          </span>
          <span
            className={cn(
              "shrink-0 tabular-nums fuwari-text-50",
              length > MOMENT_TEXT_MAX_LENGTH && "text-(--fuwari-danger-fg)",
            )}
          >
            {m.moment_admin_count({
              count: length,
              limit: MOMENT_TEXT_MAX_LENGTH,
            })}
          </span>
        </div>
      </div>

      {hasImages ? (
        <MomentImageThumbs
          images={draft.images}
          disabled={submitting}
          onRemove={(key) =>
            setDraft({
              ...latest.current,
              images: latest.current.images.filter(
                (image) => image.key !== key,
              ),
            })
          }
        />
      ) : null}
      {draft.video ? (
        <MomentVideoPreview
          video={draft.video}
          disabled={submitting}
          onChange={() => setPanel("video")}
          onRemove={() => {
            setDraft({ ...latest.current, video: null });
            setPanel(null);
          }}
        />
      ) : null}

      {panel === "images" ? (
        <MomentImagePanel
          library={library}
          uploading={isUploading}
          full={draft.images.length >= MOMENT_IMAGES_MAX}
          onFiles={(files) => void uploadImages(files)}
          onSelect={pickImage}
          onClose={() => setPanel(null)}
        />
      ) : null}
      {panel === "video" ? (
        <MomentVideoPanel
          video={draft.video}
          onApply={applyProvider}
          onApplyDirect={applyDirect}
          onCancel={() => setPanel(null)}
        />
      ) : null}

      {notice}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          icon={<ImagePlus size={16} />}
          disabled={hasVideo || submitting}
          aria-expanded={panel === "images"}
          onClick={() => setPanel(panel === "images" ? null : "images")}
        >
          {m.moment_admin_add_images()}
        </Button>
        <Button
          size="sm"
          icon={<Video size={16} />}
          disabled={hasImages || hasVideo || submitting}
          aria-expanded={panel === "video"}
          onClick={() => setPanel(panel === "video" ? null : "video")}
        >
          {m.moment_admin_add_video()}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {error ? (
            <StatusText error className="text-xs">
              {error}
            </StatusText>
          ) : null}
          {onCancel ? (
            <Button size="sm" disabled={submitting} onClick={onCancel}>
              {m.common_cancel()}
            </Button>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting}
            disabled={!canSubmit}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
      {hasVideo || hasImages ? (
        <p className="-mt-1 text-xs fuwari-text-50">
          {hasVideo
            ? m.moment_admin_images_blocked_by_video()
            : m.moment_admin_video_blocked_by_images()}
        </p>
      ) : null}
    </form>
  );
}
