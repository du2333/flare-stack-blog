import { ORPCError } from "@orpc/client";
import type {
  CreateMomentInput,
  MomentImage,
  MomentVideoInput,
  PublicMoment,
  UpdateMomentInput,
} from "@/features/moments/schema/moments.schema";
import {
  MOMENT_IMAGES_MAX,
  MOMENT_TEXT_MAX_LENGTH,
  isMomentTextFormat,
  momentTextLength,
} from "@/features/moments/utils/moment-rules";
import type {
  DirectVideo,
  VideoMeta,
  VideoSource,
} from "@/features/posts/utils/video-source";
import {
  directVideoOf,
  videoMetaOf,
  videoPageUrl,
  videoSourceOf,
} from "@/features/posts/utils/video-source";
import { m } from "@/paraglide/messages";

/** The video of a Moment being written. */
export type DraftVideo =
  /** Bilibili or YouTube; the server looks up the rest when it is saved. */
  | { kind: "provider"; source: VideoSource; meta: VideoMeta }
  | { kind: "direct"; video: DirectVideo };

/**
 * What the form holds: text, and either images or a video, which the form
 * never lets coexist.
 */
export interface MomentDraft {
  text: string;
  images: Array<MomentImage>;
  video: DraftVideo | null;
}

export const EMPTY_DRAFT: MomentDraft = { text: "", images: [], video: null };

/** Whether the draft holds nothing at all, not even whitespace. */
export function draftIsEmpty(draft: MomentDraft) {
  return draft.text === "" && draft.images.length === 0 && draft.video === null;
}

/**
 * `images` with the one at `from` moved to `to`; the order of the images is
 * the order they are published in. Out-of-range positions leave it as it is.
 */
export function moveImage<T>(
  images: ReadonlyArray<T>,
  from: number,
  to: number,
) {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= images.length ||
    to >= images.length
  ) {
    return [...images];
  }
  const next = [...images];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** The draft of a Moment being edited. */
export function draftOfMoment(moment: PublicMoment): MomentDraft {
  const stored = moment.video;
  let video: DraftVideo | null = null;
  if (stored) {
    const source = videoSourceOf(stored);
    const direct = directVideoOf(stored);
    if (source) {
      video = { kind: "provider", source, meta: videoMetaOf(stored) };
    } else if (direct) {
      video = { kind: "direct", video: direct };
    }
  }
  return { text: moment.text, images: [...moment.images], video };
}

/** What stops a draft from being posted, if anything. */
export type DraftProblem =
  | "empty"
  | "text_too_long"
  | "text_invalid"
  | "too_many_images";

/** The text as the server keeps it: without leading and trailing whitespace. */
export function trimmedText(draft: MomentDraft) {
  return draft.text.trim();
}

/** How many characters the text counts as against the limit. */
export function draftTextLength(draft: MomentDraft) {
  return momentTextLength(trimmedText(draft));
}

export function draftProblem(draft: MomentDraft): DraftProblem | null {
  const text = trimmedText(draft);
  if (momentTextLength(text) > MOMENT_TEXT_MAX_LENGTH) return "text_too_long";
  if (!isMomentTextFormat(text)) return "text_invalid";
  if (draft.images.length > MOMENT_IMAGES_MAX) return "too_many_images";
  if (text === "" && draft.images.length === 0 && draft.video === null) {
    return "empty";
  }
  return null;
}

function imagePath(image: MomentImage) {
  return `/images/${image.key}`;
}

/** `video` as a write names it. */
export function videoInputOf(video: DraftVideo): MomentVideoInput {
  if (video.kind === "provider") return { url: videoPageUrl(video.source) };
  const { src, cover, title, pageUrl, duration } = video.video;
  return {
    src,
    poster: cover,
    title,
    page: pageUrl,
    ...(duration === null ? {} : { duration }),
  };
}

/** The write that posts a new Moment. */
export function createInputOf(draft: MomentDraft): CreateMomentInput {
  const text = trimmedText(draft);
  return {
    ...(text === "" ? {} : { text }),
    ...(draft.images.length > 0 ? { images: draft.images.map(imagePath) } : {}),
    ...(draft.video ? { video: videoInputOf(draft.video) } : {}),
  };
}

/**
 * The fields that differ between the Moment as it was read and the draft, or
 * `null` when none does. Switching between images and a video states the
 * emptied side too, as the API requires; a video that did not change is left
 * out, so the server keeps what it looked up.
 */
export function updateInputOf(
  initial: MomentDraft,
  draft: MomentDraft,
): UpdateMomentInput["data"] | null {
  const data: UpdateMomentInput["data"] = {};

  const text = trimmedText(draft);
  if (text !== initial.text.trim()) data.text = text;

  const paths = draft.images.map(imagePath);
  if (paths.join("\n") !== initial.images.map(imagePath).join("\n")) {
    data.images = paths;
  }

  if (draft.video === null) {
    if (initial.video !== null) data.video = null;
  } else {
    const next = videoInputOf(draft.video);
    const before = initial.video ? videoInputOf(initial.video) : null;
    if (JSON.stringify(next) !== JSON.stringify(before)) data.video = next;
  }

  return Object.keys(data).length > 0 ? data : null;
}

/** The code of a refused write, if it was one the Moments API answers. */
export function momentErrorCode(error: unknown) {
  return error instanceof ORPCError ? error.code : null;
}

/** Whether a save was refused because the Moment was saved since it was read. */
export function isEditConflict(error: unknown) {
  return momentErrorCode(error) === "EDIT_CONFLICT";
}

/** Whether a write was refused because the Moment no longer exists. */
export function isMomentGone(error: unknown) {
  return momentErrorCode(error) === "MOMENT_NOT_FOUND";
}

/** What to tell the Admin when a write failed. */
export function momentErrorMessage(error: unknown) {
  switch (momentErrorCode(error)) {
    case "MOMENT_EMPTY":
      return m.moment_admin_error_empty();
    case "MOMENT_TEXT_TOO_LONG":
      return m.moment_admin_error_text_too_long({
        limit: MOMENT_TEXT_MAX_LENGTH,
      });
    case "MOMENT_TEXT_INVALID":
      return m.moment_admin_error_text_invalid();
    case "MOMENT_TOO_MANY_IMAGES":
      return m.moment_admin_error_too_many_images({
        limit: MOMENT_IMAGES_MAX,
      });
    case "MOMENT_IMAGES_AND_VIDEO":
      return m.moment_admin_error_images_and_video();
    case "MOMENT_IMAGE_INVALID":
      return m.moment_admin_error_image_invalid();
    case "MOMENT_IMAGE_NOT_FOUND":
      return m.moment_admin_error_image_not_found();
    case "MOMENT_VIDEO_INVALID":
      return m.moment_admin_error_video_invalid();
    case "MOMENT_NOT_FOUND":
      return m.moment_admin_error_not_found();
    default:
      return m.moment_admin_error_failed();
  }
}
