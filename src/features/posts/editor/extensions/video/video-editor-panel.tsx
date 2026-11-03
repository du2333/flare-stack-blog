import type { KeyboardEvent, Ref } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { videoProviderName } from "@/features/posts/components/content/video-embed";
import type {
  DirectVideo,
  DirectVideoLookup,
  VideoSource,
} from "@/features/posts/utils/video-source";
import {
  directVideoAddress,
  parseVideoInput,
} from "@/features/posts/utils/video-source";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { readVideoDuration } from "./read-duration";
import type { ResolveDirectVideo } from "./use-direct-video-lookup";
import { useDirectVideoLookup } from "./use-direct-video-lookup";

export interface VideoEditorPanelProps {
  /** The link to start from. */
  link: string;
  /** The Direct Video being reopened, whose fields start as it has them. */
  direct?: DirectVideo | null;
  /** Whether the video was just inserted, which names the apply button. */
  inserted: boolean;
  /**
   * Looks up an address that may be a Direct Video. Without it nothing is
   * looked up, and a Direct Video is filled in by hand.
   */
  resolveDirectVideo?: ResolveDirectVideo;
  onApply: (source: VideoSource) => void;
  onApplyDirect: (video: DirectVideo) => void;
  onCancel: () => void;
  inputRef?: Ref<HTMLInputElement>;
}

/** What the Admin has typed into the fields, for the address it was typed for. */
interface Edits {
  address: string | null;
  title?: string;
  cover?: string;
  src?: string;
}

/** The answer a reopened Direct Video would have got, so it is not asked for again. */
function seedOf(direct: DirectVideo) {
  const address = direct.pageUrl ?? direct.src;
  const result: DirectVideoLookup = direct.pageUrl
    ? {
        kind: "page",
        pageUrl: direct.pageUrl,
        src: direct.src,
        title: direct.title,
        cover: direct.cover,
      }
    : { kind: "file", src: direct.src };
  return { address, result };
}

type Tone = "ok" | "muted" | "error";

/**
 * Takes a video page link or a provider's embed code, or the address of a
 * Direct Video, and says, as it is typed, which video it found or why it
 * found none. A Direct Video's address is looked up once typing pauses, then
 * its playback address, title and cover can be edited. Enter applies a found
 * video, Escape cancels.
 */
export function VideoEditorPanel({
  link,
  direct = null,
  inserted,
  resolveDirectVideo,
  onApply,
  onApplyDirect,
  onCancel,
  inputRef,
}: VideoEditorPanelProps) {
  const statusId = useId();
  const [value, setValue] = useState(link);
  const [seed] = useState(() => (direct ? seedOf(direct) : undefined));
  const [edits, setEdits] = useState<Edits>(() =>
    direct && seed
      ? {
          address: seed.address,
          title: direct.title ?? "",
          cover: direct.cover ?? "",
          // With a page, the file may be what the page names or the Admin's
          // own; keeping it as the playback address changes nothing either way.
          src: direct.pageUrl ? direct.src : undefined,
        }
      : { address: null },
  );
  const [applying, setApplying] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const input = useMemo(() => parseVideoInput(value), [value]);
  const source = input.kind === "video" ? input.source : null;
  const address =
    source || input.kind === "shortLink" ? null : directVideoAddress(value);
  const lookup = useDirectVideoLookup(address, resolveDirectVideo, seed);
  const result = lookup.status === "done" ? lookup.result : null;
  const editable = result && result.kind !== "unsupported" ? result : null;

  // Typed fields belong to the address they were typed for; a new address
  // starts from what it was found to have.
  const mine: Edits = edits.address === address ? edits : { address };
  const found = editable?.kind === "page" ? editable : null;
  const title = mine.title ?? found?.title ?? "";
  const cover = mine.cover ?? found?.cover ?? "";
  const srcValue = (mine.src ?? "").trim();
  const showSrc = editable !== null && editable.kind !== "file";
  const edit = (change: Partial<Edits>) => setEdits({ ...mine, ...change });

  // A playback address of the Admin's own is checked like the address was,
  // unless the server has already confirmed that very file.
  const confirmedSrc = found?.src ?? null;
  const srcAddress = showSrc && srcValue ? directVideoAddress(srcValue) : null;
  const srcInvalid = showSrc && srcValue !== "" && srcAddress === null;
  const srcLookup = useDirectVideoLookup(
    srcAddress === confirmedSrc ? null : srcAddress,
    resolveDirectVideo,
  );
  const srcResult = srcLookup.status === "done" ? srcLookup.result : null;
  const srcReading = srcLookup.status === "reading";
  const srcNotFile =
    srcResult !== null &&
    srcResult.kind !== "file" &&
    srcResult.kind !== "unreachable";
  let ownSrc: string | null = null;
  if (srcAddress !== null && srcAddress === confirmedSrc) ownSrc = srcAddress;
  else if (srcResult?.kind === "file") ownSrc = srcResult.src;
  else if (srcResult?.kind === "unreachable") ownSrc = srcAddress;

  let playback: string | null = null;
  let pageUrl: string | null = null;
  if (editable?.kind === "file") {
    playback = editable.src;
  } else if (editable?.kind === "page") {
    pageUrl = editable.pageUrl;
    playback = srcValue ? ownSrc : editable.src;
  } else if (editable?.kind === "unreachable" && address) {
    // The file may well play in a browser that the Worker could not reach, so
    // an address with nothing else said is taken to be the file itself.
    playback = srcValue ? ownSrc : address;
    pageUrl = playback && playback !== address ? address : null;
  }

  const coverValue = cover.trim();
  const coverAddress = coverValue ? directVideoAddress(coverValue) : null;
  const coverInvalid = coverValue !== "" && coverAddress === null;

  const directVideo =
    playback && !coverInvalid
      ? {
          src: playback,
          pageUrl,
          title: title.trim() || null,
          cover: coverAddress,
          duration: null,
        }
      : null;
  const canApply = source !== null || (directVideo !== null && !applying);

  const apply = async () => {
    if (source) {
      onApply(source);
      return;
    }
    if (!directVideo || applying) return;
    setApplying(true);
    // The length is a nicety: reading it never holds the Admin up for long,
    // and a file that did not change keeps the length it had.
    const duration =
      direct && direct.src === directVideo.src
        ? direct.duration
        : await readVideoDuration(directVideo.src);
    // Cancelled or moved on to another video meanwhile.
    if (!mounted.current) return;
    onApplyDirect({ ...directVideo, duration });
  };

  let status: string;
  let tone: Tone = "muted";
  if (source) {
    status = m.editor_video_recognized({
      provider: videoProviderName(source.provider),
      video: source.videoId + (source.page ? ` · P${source.page}` : ""),
    });
    tone = "ok";
  } else if (!value.trim()) {
    status = m.editor_video_hint();
  } else if (input.kind === "shortLink") {
    status = m.editor_video_short_link();
    tone = "error";
  } else if (!address) {
    status = m.editor_video_unsupported();
    tone = "error";
  } else if (!result) {
    status = m.editor_video_reading();
  } else if (result.kind === "file") {
    status = m.editor_video_direct_file();
    tone = "ok";
  } else if (result.kind === "page" && srcReading) {
    // The playback address being read is what the status is about, not the
    // page's own video, which it may be about to replace.
    status = m.editor_video_src_reading();
  } else if (result.kind === "page" && srcResult?.kind === "file") {
    status = m.editor_video_src_confirmed();
    tone = "ok";
  } else if (result.kind === "page") {
    status = playback
      ? m.editor_video_direct_page()
      : m.editor_video_direct_page_empty();
    tone = playback ? "ok" : "muted";
  } else if (result.kind === "unreachable") {
    status = m.editor_video_direct_unreachable();
  } else {
    status = m.editor_video_direct_unsupported();
    tone = "error";
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    } else if (
      event.key === "Enter" &&
      event.target instanceof HTMLInputElement
    ) {
      event.preventDefault();
      if (canApply) void apply();
    }
  };

  return (
    <div
      data-video-editor=""
      onKeyDown={onKeyDown}
      className="flex flex-col gap-2 text-left [--fuwari-field-font-size:13px] [--fuwari-field-height:36px] [--fuwari-field-radius:8px]"
    >
      <Input
        ref={inputRef}
        type="text"
        aria-label={m.editor_video_input()}
        aria-describedby={statusId}
        value={value}
        spellCheck={false}
        placeholder={m.editor_video_placeholder()}
        onChange={(event) => setValue(event.target.value)}
      />
      {editable ? (
        <div className="flex flex-col gap-2">
          {showSrc ? (
            <FormField
              label={m.editor_video_src_label()}
              required={!playback && !srcValue}
              optional={
                playback || srcValue ? m.editor_video_optional() : undefined
              }
              hint={
                srcReading
                  ? m.editor_video_reading()
                  : m.editor_video_src_hint()
              }
              error={
                srcInvalid
                  ? m.editor_video_address_invalid()
                  : srcNotFile
                    ? m.editor_video_src_not_file()
                    : undefined
              }
            >
              <Input
                type="text"
                value={mine.src ?? ""}
                spellCheck={false}
                onChange={(event) => edit({ src: event.target.value })}
              />
            </FormField>
          ) : null}
          <FormField
            label={m.editor_video_title_label()}
            optional={m.editor_video_optional()}
          >
            <Input
              type="text"
              value={title}
              maxLength={200}
              onChange={(event) => edit({ title: event.target.value })}
            />
          </FormField>
          <FormField
            label={m.editor_video_cover_label()}
            optional={m.editor_video_optional()}
            error={coverInvalid ? m.editor_video_address_invalid() : undefined}
          >
            <Input
              type="text"
              value={cover}
              spellCheck={false}
              onChange={(event) => edit({ cover: event.target.value })}
            />
          </FormField>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <p
          id={statusId}
          role="status"
          className={cn(
            "mr-auto min-w-0 text-xs",
            tone === "ok" && "text-(--fuwari-primary)",
            tone === "error" && "text-(--fuwari-danger-fg)",
            tone === "muted" && "fuwari-text-50",
          )}
        >
          {status}
        </p>
        <Button size="sm" onClick={onCancel}>
          {m.common_cancel()}
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={applying}
          onClick={() => void apply()}
          disabled={!canApply}
        >
          {inserted ? m.editor_video_insert() : m.editor_video_update()}
        </Button>
      </div>
    </div>
  );
}
