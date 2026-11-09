import { ImagePlus, Video } from "lucide-react";
import type {
  ClipboardEvent,
  DragEvent,
  KeyboardEvent,
  ReactNode,
} from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Textarea } from "@/components/ui/input";
import { StatusText } from "@/components/ui/status-text";
import {
  useMediaPicker,
  useMediaUpload,
} from "@/features/media/components/media-library/hooks";
import type { MediaAsset } from "@/features/media/components/media-library/types";
import { MomentAvatar } from "@/features/moments/components/moment-avatar";
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
import {
  draftIsEmpty,
  draftProblem,
  draftTextLength,
  moveImage,
  updateInputOf,
} from "./moment-draft";
import type { PendingImage } from "./moment-media-fields";
import {
  MomentImageGrid,
  MomentImagePopover,
  MomentVideoCard,
  MomentVideoPopover,
  momentImageOf,
} from "./moment-media-fields";

type Panel = "images" | "video" | null;

/** The count appears this close to the limit, so it is not noise before then. */
const COUNT_SHOWN_FROM = 900;

/** The picture the browser can show of a file before it is uploaded. */
function previewOf(file: File) {
  try {
    return URL.createObjectURL(file);
  } catch {
    return null;
  }
}

function revokePreview(preview: string | null) {
  if (!preview) return;
  try {
    URL.revokeObjectURL(preview);
  } catch {
    // A preview that cannot be released is only held until the page closes.
  }
}

/** Whether a drag is carrying files from outside the page. */
function carriesFiles(event: DragEvent) {
  return Array.from(event.dataTransfer.types).includes("Files");
}

/**
 * The box that writes a Moment, for a new one and for editing one: the
 * Admin's avatar, then text that grows as it is typed, a row of icon buttons
 * for images and a video, and Post. A Moment has images or a video, never
 * both, and the buttons say why one is off. Images can also be pasted into
 * the text or dropped on the box, and are uploaded and attached.
 *
 * The draft is its own; `onSubmit` gets it once it can be posted. Post stays
 * off while the draft is empty or invalid, while images upload and, with
 * `requireChange`, until something differs from `initial`. A `collapsible`
 * box shrinks to one line while it is empty and unfocused.
 */
export function MomentForm({
  label,
  initial,
  submitLabel,
  submitting,
  requireChange = false,
  locked = false,
  loading = false,
  collapsible = false,
  autoFocus = false,
  error,
  notice,
  onSubmit,
  onCancel,
  onDraftChange,
}: {
  /** Names the box for screen readers. */
  label: string;
  initial: MomentDraft;
  submitLabel: string;
  submitting: boolean;
  requireChange?: boolean;
  /** Keeps Post off for a reason the notice explains. */
  locked?: boolean;
  /** Shows the draft but takes no input yet, while what it edits is read. */
  loading?: boolean;
  /** Shrinks to one line while empty and unfocused. */
  collapsible?: boolean;
  /** Puts the cursor at the end of the text when it appears. */
  autoFocus?: boolean;
  /** Why the last attempt failed, shown above the buttons. */
  error?: string | null;
  /** Shown above the buttons, such as an Edit Conflict. */
  notice?: ReactNode;
  onSubmit: (draft: MomentDraft) => void;
  onCancel?: () => void;
  /** Told of every change to the draft, to keep it for a later visit. */
  onDraftChange?: (draft: MomentDraft) => void;
}) {
  const [draft, setDraftState] = useState(initial);
  // Uploads and imports land after the render that started them.
  const latest = useRef(draft);
  const [pending, setPendingState] = useState<Array<PendingImage>>([]);
  const pendingRef = useRef(pending);
  const nextPendingId = useRef(0);
  const [panel, setPanel] = useState<Panel>(null);
  const panelRef = useRef(panel);
  panelRef.current = panel;
  const [expanded, setExpanded] = useState(false);
  const [fileDrags, setFileDrags] = useState(0);
  const [imagesAnchor, setImagesAnchor] = useState<HTMLElement | null>(null);
  const [videoAnchor, setVideoAnchor] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const library = useMediaPicker(panel === "images");
  const { uploadFiles } = useMediaUpload();

  const onDraftChangeRef = useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;
  useEffect(() => {
    onDraftChangeRef.current?.(draft);
  }, [draft]);

  useEffect(() => {
    const field = textRef.current;
    if (!autoFocus || !field) return;
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }, [autoFocus]);

  // The previews are the browser's to hold only as long as the box is.
  useEffect(
    () => () => {
      for (const item of pendingRef.current) revokePreview(item.preview);
    },
    [],
  );

  const setDraft = (next: MomentDraft) => {
    latest.current = next;
    setDraftState(next);
  };

  const setPending = (
    update: (current: Array<PendingImage>) => Array<PendingImage>,
  ) => {
    const next = update(pendingRef.current);
    pendingRef.current = next;
    setPendingState(next);
  };

  const collapsed =
    collapsible &&
    !expanded &&
    panel === null &&
    pending.length === 0 &&
    draftIsEmpty(draft);

  // Back to one line once focus has gone and nothing is left in the box.
  const collapseIfIdle = () => {
    if (!collapsible) return;
    if (rootRef.current?.contains(document.activeElement)) return;
    if (panelRef.current !== null) return;
    if (pendingRef.current.length > 0 || !draftIsEmpty(latest.current)) return;
    setExpanded(false);
  };
  useEffect(() => {
    if (panel !== null) return;
    const timer = window.setTimeout(collapseIfIdle, 0);
    return () => window.clearTimeout(timer);
  }, [panel]);

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
    if (latest.current.video) {
      toast.info(m.moment_admin_images_blocked_by_video());
      return;
    }
    // Files past the limit are not uploaded only to be left out.
    const room =
      MOMENT_IMAGES_MAX -
      latest.current.images.length -
      pendingRef.current.length;
    if (files.length > room) {
      toast.warning(
        m.moment_admin_images_truncated({ limit: MOMENT_IMAGES_MAX }),
      );
    }
    const batch = files.slice(0, Math.max(room, 0));
    if (batch.length === 0) return;
    setExpanded(true);

    const ids = new Map<File, number>();
    const settle = (id: number) => {
      setPending((current) => {
        const item = current.find((entry) => entry.id === id);
        if (item) revokePreview(item.preview);
        return current.filter((entry) => entry.id !== id);
      });
    };
    await uploadFiles(batch, {
      quietSuccess: true,
      onFileState: (file, state, media) => {
        if (state === "queued") {
          const id = nextPendingId.current++;
          ids.set(file, id);
          setPending((current) => [
            ...current,
            { id, preview: previewOf(file), state: "queued" },
          ]);
          return;
        }
        const id = ids.get(file);
        if (id === undefined) return;
        if (state === "uploading") {
          setPending((current) =>
            current.map((entry) =>
              entry.id === id ? { ...entry, state: "uploading" } : entry,
            ),
          );
          return;
        }
        settle(id);
        if (state === "done" && media) addImages([momentImageOf(media)]);
      },
    });
  };

  const idle = !submitting && !loading;

  /** Images from the clipboard or a drop: uploaded and attached. */
  const attachFiles = (files: Array<File>) => {
    if (!idle) return;
    void uploadImages(files);
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
    problem === null && changed && !locked && pending.length === 0 && idle;
  const hasImages = draft.images.length > 0;
  const hasVideo = draft.video !== null;
  const imagesFull = draft.images.length + pending.length >= MOMENT_IMAGES_MAX;
  const dropping = fileDrags > 0 && !hasVideo;

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

  // A screenshot has no text beside it; a table copied from a sheet does, and
  // keeps pasting as text.
  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (files.length === 0 || event.clipboardData.getData("text/plain")) return;
    event.preventDefault();
    attachFiles(files);
  };

  const textError =
    problem === "text_too_long"
      ? m.moment_admin_text_too_long({
          over: length - MOMENT_TEXT_MAX_LENGTH,
        })
      : problem === "text_invalid"
        ? m.moment_admin_text_invalid()
        : null;

  /** A button's name, with why it is off when it is. */
  const nameWith = (name: string, reason: string | null) =>
    reason ? m.moment_admin_button_disabled({ label: name, reason }) : name;
  const imagesReason = hasVideo
    ? m.moment_admin_images_blocked_by_video()
    : imagesFull
      ? m.moment_admin_images_full({ limit: MOMENT_IMAGES_MAX })
      : null;
  const videoReason = hasImages
    ? m.moment_admin_video_blocked_by_images()
    : null;

  return (
    <section
      ref={rootRef}
      aria-label={label}
      className={cn(
        "fuwari-card-base relative flex gap-3 p-4 md:p-5",
        dropping && "ring-2 ring-(--fuwari-primary)",
      )}
      onClick={() => {
        if (collapsed) textRef.current?.focus();
      }}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && rootRef.current?.contains(next)) return;
        collapseIfIdle();
      }}
      onDragEnter={(event) => {
        if (carriesFiles(event)) setFileDrags((count) => count + 1);
      }}
      onDragOver={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = idle && !hasVideo ? "copy" : "none";
      }}
      onDragLeave={(event) => {
        if (carriesFiles(event))
          setFileDrags((count) => Math.max(count - 1, 0));
      }}
      onDrop={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        setFileDrags(0);
        attachFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <MomentAvatar />
      <form
        className="flex min-w-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Textarea
          ref={textRef}
          bare
          autoGrow
          rows={1}
          value={draft.text}
          readOnly={!idle}
          aria-label={m.moment_admin_text_label()}
          aria-invalid={textError ? true : undefined}
          placeholder={m.moment_admin_text_placeholder()}
          className="py-2 text-base leading-relaxed"
          onFocus={() => setExpanded(true)}
          onChange={(event) =>
            setDraft({ ...latest.current, text: event.target.value })
          }
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
        <div
          inert={collapsed}
          className={cn(
            "grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none",
            collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
          )}
        >
          {/* The bottom padding leaves room for focus rings while open; collapsed it would hold the top of the toolbar open. */}
          <div
            className={cn(
              "-mx-1 flex min-h-0 flex-col gap-3 overflow-hidden px-1",
              collapsed ? "pb-0" : "-mb-1 pb-1",
            )}
          >
            {hasImages || pending.length > 0 ? (
              <MomentImageGrid
                images={draft.images}
                pending={pending}
                disabled={!idle}
                onRemove={(key) =>
                  setDraft({
                    ...latest.current,
                    images: latest.current.images.filter(
                      (image) => image.key !== key,
                    ),
                  })
                }
                onMove={(from, to) =>
                  setDraft({
                    ...latest.current,
                    images: moveImage(latest.current.images, from, to),
                  })
                }
              />
            ) : null}
            {draft.video ? (
              <MomentVideoCard
                video={draft.video}
                disabled={!idle}
                onRemove={() => {
                  setDraft({ ...latest.current, video: null });
                  setPanel(null);
                }}
              />
            ) : null}

            {notice}
            {textError ? (
              <StatusText error className="text-xs">
                {textError}
              </StatusText>
            ) : null}
            {error ? (
              <StatusText error className="text-xs">
                {error}
              </StatusText>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
              <IconButton
                ref={setImagesAnchor}
                label={nameWith(m.moment_admin_add_images(), imagesReason)}
                disabled={!idle || imagesReason !== null}
                aria-haspopup="dialog"
                aria-expanded={panel === "images"}
                onClick={() => setPanel(panel === "images" ? null : "images")}
              >
                <ImagePlus size={18} />
              </IconButton>
              <IconButton
                ref={setVideoAnchor}
                label={nameWith(
                  hasVideo
                    ? m.moment_admin_video_change()
                    : m.moment_admin_add_video(),
                  videoReason,
                )}
                disabled={!idle || videoReason !== null}
                aria-haspopup="dialog"
                aria-expanded={panel === "video"}
                onClick={() => setPanel(panel === "video" ? null : "video")}
              >
                <Video size={18} />
              </IconButton>
              <div className="ml-auto flex items-center gap-2">
                {length >= COUNT_SHOWN_FROM ? (
                  <span
                    className={cn(
                      "text-xs tabular-nums fuwari-text-50",
                      length > MOMENT_TEXT_MAX_LENGTH &&
                        "text-(--fuwari-danger-fg)",
                    )}
                  >
                    {m.moment_admin_count({
                      count: length,
                      limit: MOMENT_TEXT_MAX_LENGTH,
                    })}
                  </span>
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
          </div>
        </div>
      </form>

      <MomentImagePopover
        open={panel === "images"}
        anchor={imagesAnchor}
        library={library}
        full={imagesFull}
        onFiles={attachFiles}
        onSelect={pickImage}
        onClose={() => setPanel(null)}
      />
      <MomentVideoPopover
        open={panel === "video"}
        anchor={videoAnchor}
        video={draft.video}
        onApply={applyProvider}
        onApplyDirect={applyDirect}
        onClose={() => setPanel(null)}
      />

      {dropping ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[inherit] bg-(--fuwari-card-bg)/80 text-sm font-medium text-(--fuwari-primary)"
        >
          {m.moment_admin_drop_hint()}
        </div>
      ) : null}
    </section>
  );
}
