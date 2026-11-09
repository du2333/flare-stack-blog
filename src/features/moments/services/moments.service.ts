import { invalidate } from "@/features/cache/public-cache";
import * as MomentRepo from "@/features/moments/data/moments.data";
import {
  latestMoments,
  momentById,
  momentsPage,
} from "@/features/moments/moments.cache";
import type {
  CreateMomentInput,
  MomentVideoInput,
  UpdateMomentInput,
} from "@/features/moments/schema/moments.schema";
import {
  isMomentTextFormat,
  MOMENT_IMAGES_MAX,
  MOMENT_TEXT_MAX_LENGTH,
  momentTextLength,
} from "@/features/moments/utils/moment-rules";
import { toAdminMoment } from "@/features/moments/utils/public-moment";
import * as VideoMetaService from "@/features/posts/services/video-meta.service";
import { mediaPathKey } from "@/features/posts/utils/content";
import { sameJson } from "@/features/posts/utils/same-json";
import {
  directVideoAddress,
  directVideoAttrs,
  directVideoOf,
  EMPTY_VIDEO_META,
  parseVideoInput,
  videoMetaOf,
  videoSourceOf,
} from "@/features/posts/utils/video-source";
import type { MomentVideo } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env/server.env";
import { err, ok } from "@/lib/errors";

type ReadContext = DbContext & { executionCtx: ExecutionContext };

/** Why a Moment's content cannot be saved. */
export type MomentContentError =
  | { reason: "MOMENT_EMPTY" }
  | { reason: "MOMENT_TEXT_TOO_LONG"; limit: number; length: number }
  | { reason: "MOMENT_TEXT_INVALID" }
  | { reason: "MOMENT_TOO_MANY_IMAGES"; limit: number; count: number }
  | { reason: "MOMENT_IMAGES_AND_VIDEO" }
  | { reason: "MOMENT_IMAGE_INVALID"; images: Array<string> }
  | { reason: "MOMENT_IMAGE_NOT_FOUND"; images: Array<string> }
  | {
      reason: "MOMENT_VIDEO_INVALID";
      detail: "UNSUPPORTED_LINK" | "SHORT_LINK" | "NOT_HTTPS";
      addresses: Array<string>;
    };

/** What a Moment holds once a write's content is checked and resolved. */
type MomentContent = {
  text: string;
  mediaIds: Array<number>;
  video: MomentVideo | null;
};

// ==================== public reads ====================

export function getMomentsPage(context: ReadContext, page: number) {
  return momentsPage.get(context, { page });
}

export function getMomentById(context: ReadContext, id: number) {
  return momentById.get(context, { id });
}

export function getLatestMoments(context: ReadContext) {
  return latestMoments.get(context, {});
}

/**
 * Whether any Moment exists, for the public navigation and home sidebar. It
 * reads the cached latest Moments, which every write refreshes.
 */
export async function momentsExist(context: ReadContext) {
  return (await latestMoments.get(context, {})).length > 0;
}

// ==================== Admin ====================

export async function findMomentById(context: DbContext, id: number) {
  const row = await MomentRepo.findMomentById(context.db, id);
  return row ? toAdminMoment(row) : null;
}

/**
 * The text as stored: trimmed, and held to the length and character rules.
 */
function checkText(text: string) {
  const trimmed = text.trim();
  const length = momentTextLength(trimmed);
  if (length > MOMENT_TEXT_MAX_LENGTH) {
    return err({
      reason: "MOMENT_TEXT_TOO_LONG",
      limit: MOMENT_TEXT_MAX_LENGTH,
      length,
    });
  }
  if (!isMomentTextFormat(trimmed))
    return err({ reason: "MOMENT_TEXT_INVALID" });
  return ok(trimmed);
}

/** The Media keys `images` name, or the entries that are not Media paths. */
function imageKeysOf(context: DbContext, images: Array<string>) {
  const siteHost = serverEnv(context.env).DOMAIN;
  const keys: Array<string> = [];
  const invalid: Array<string> = [];
  for (const image of images) {
    const key = mediaPathKey(image.trim(), siteHost);
    if (key) keys.push(key);
    else invalid.push(image);
  }
  if (invalid.length > 0) {
    return err({
      reason: "MOMENT_IMAGE_INVALID",
      images: [...new Set(invalid)],
    });
  }
  return ok(keys);
}

/** The Media ids of `keys`, in order, or the keys no Media has. */
async function mediaIdsOf(context: DbContext, keys: Array<string>) {
  const found = await MomentRepo.findMediaByKeys(context.db, keys);
  const idByKey = new Map(found.map((media) => [media.key, media.id]));
  const missing = keys.filter((key) => !idByKey.has(key));
  if (missing.length > 0) {
    return err({
      reason: "MOMENT_IMAGE_NOT_FOUND",
      images: [...new Set(missing)].map((key) => `/images/${key}`),
    });
  }
  return ok(keys.map((key) => idByKey.get(key)!));
}

function sameProviderVideo(a: MomentVideo | null, b: MomentVideo) {
  const left = videoSourceOf(a);
  const right = videoSourceOf(b);
  return (
    left !== null &&
    right !== null &&
    left.provider === right.provider &&
    left.videoId === right.videoId &&
    left.page === right.page
  );
}

/**
 * `input` as the video block attributes a Moment stores, held to the rules a
 * post body's video follows (`videoSourceOf`, `directVideoOf`). A Bilibili or
 * YouTube video gets the title, cover and length it had in `current`, or else
 * what its site says; a failed lookup leaves them empty. Nothing is requested
 * for a Direct Video (ADR 0036): its length is the one given, else the one it
 * had while its file stays the same.
 */
async function resolveVideo(
  input: MomentVideoInput,
  current: MomentVideo | null,
) {
  if ("url" in input) {
    const parsed = parseVideoInput(input.url);
    const source =
      parsed.kind === "video" ? videoSourceOf({ ...parsed.source }) : null;
    if (!source) {
      return err({
        reason: "MOMENT_VIDEO_INVALID",
        detail:
          parsed.kind === "shortLink"
            ? ("SHORT_LINK" as const)
            : ("UNSUPPORTED_LINK" as const),
        addresses: [input.url],
      });
    }
    const video: MomentVideo = {
      provider: source.provider,
      videoId: source.videoId,
      page: source.page,
      start: source.start,
      ...EMPTY_VIDEO_META,
      src: null,
      pageUrl: null,
    };
    const known = sameProviderVideo(current, video)
      ? videoMetaOf(current)
      : EMPTY_VIDEO_META;
    const meta =
      known.title !== null || known.cover !== null
        ? known
        : await VideoMetaService.fetchVideoMeta(source).catch(() => null);
    return ok({ ...video, ...(meta ?? EMPTY_VIDEO_META) });
  }

  const refused = [input.src, input.poster, input.page].filter(
    (address): address is string =>
      typeof address === "string" &&
      address.trim() !== "" &&
      directVideoAddress(address.trim()) === null,
  );
  if (refused.length > 0) {
    return err({
      reason: "MOMENT_VIDEO_INVALID",
      detail: "NOT_HTTPS" as const,
      addresses: refused,
    });
  }
  const src = input.src.trim();
  const direct = directVideoOf({
    provider: "direct",
    src,
    cover: input.poster?.trim() || null,
    title: input.title ?? null,
    pageUrl: input.page?.trim() || null,
    duration:
      input.duration ??
      (current?.provider === "direct" && directVideoOf(current)?.src === src
        ? current.duration
        : null),
  });
  if (!direct) {
    return err({
      reason: "MOMENT_VIDEO_INVALID",
      detail: "NOT_HTTPS" as const,
      addresses: [input.src],
    });
  }
  return ok({ ...directVideoAttrs(direct) });
}

/**
 * Checks what a write would leave the Moment holding (`current` for a new
 * Moment is empty) and resolves its images to Media and its video to the
 * attributes stored. The cheap rules come first, so a refused write looks up
 * neither Media nor a video's title.
 */
export async function resolveContent(
  context: DbContext,
  changes: UpdateMomentInput["data"],
  current: {
    text: string;
    mediaIds: Array<number>;
    video: MomentVideo | null;
  } = { text: "", mediaIds: [], video: null },
) {
  let text = current.text;
  if (changes.text !== undefined) {
    const checked = checkText(changes.text);
    if (checked.error) return checked;
    text = checked.data;
  }

  if (changes.images && changes.images.length > MOMENT_IMAGES_MAX) {
    return err({
      reason: "MOMENT_TOO_MANY_IMAGES",
      limit: MOMENT_IMAGES_MAX,
      count: changes.images.length,
    });
  }
  const hasImages =
    changes.images !== undefined
      ? changes.images.length > 0
      : current.mediaIds.length > 0;
  const hasVideo =
    changes.video !== undefined
      ? changes.video !== null
      : current.video !== null;
  if (hasImages && hasVideo) return err({ reason: "MOMENT_IMAGES_AND_VIDEO" });
  if (text === "" && !hasImages && !hasVideo) {
    return err({ reason: "MOMENT_EMPTY" });
  }

  let mediaIds = current.mediaIds;
  if (changes.images !== undefined) {
    const keys = imageKeysOf(context, changes.images);
    if (keys.error) return keys;
    const ids = await mediaIdsOf(context, keys.data);
    if (ids.error) return ids;
    mediaIds = ids.data;
  }

  let video = current.video;
  if (changes.video !== undefined) {
    if (changes.video === null) {
      video = null;
    } else {
      const resolved = await resolveVideo(changes.video, current.video);
      if (resolved.error) return resolved;
      video = resolved.data;
    }
  }

  return ok<MomentContent>({ text, mediaIds, video });
}

export async function createMoment(
  context: ReadContext,
  input: CreateMomentInput,
) {
  const content = await resolveContent(context, input);
  if (content.error) return content;

  const hadMoments = await MomentRepo.hasMoments(context.db);
  let id: number;
  try {
    id = await MomentRepo.insertMoment(context.db, content.data);
  } catch (error) {
    // Media an image names was deleted after the check; nothing was written.
    if (!MomentRepo.isMomentImageGone(error)) throw error;
    const recheck = await resolveContent(context, input);
    if (recheck.error) return recheck;
    throw error;
  }

  await invalidate.momentChanged(context, {
    id,
    navigationChanged: !hadMoments,
  });
  const created = await MomentRepo.findMomentById(context.db, id);
  if (!created) throw new Error(`Moment ${id} vanished after insert`);
  return ok(toAdminMoment(created));
}

/** A conditional write matched nothing: tell a missing Moment from a newer save. */
async function editConflictOrNotFound(db: DB, id: number) {
  const saveToken = await MomentRepo.findMomentSaveToken(db, id);
  if (saveToken === null) return err({ reason: "MOMENT_NOT_FOUND" });
  return err({ reason: "EDIT_CONFLICT", saveToken });
}

function sameIds(a: Array<number>, b: Array<number>) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export async function updateMoment(
  context: ReadContext,
  input: UpdateMomentInput,
) {
  const current = await MomentRepo.findMomentById(context.db, input.id);
  if (!current) return err({ reason: "MOMENT_NOT_FOUND" });

  const stored = {
    text: current.text,
    mediaIds: current.images.map((image) => image.mediaId),
    video: current.video ?? null,
  };
  const content = await resolveContent(context, input.data, stored);
  if (content.error) return content;

  // A save that changes nothing writes nothing, so it keeps the saveToken an
  // open composer holds. A stated token still has to be the current one.
  const next = content.data;
  if (
    next.text === stored.text &&
    sameIds(next.mediaIds, stored.mediaIds) &&
    sameJson(next.video, stored.video)
  ) {
    if (
      input.saveToken !== undefined &&
      input.saveToken !== current.saveToken
    ) {
      return err({ reason: "EDIT_CONFLICT", saveToken: current.saveToken });
    }
    return ok(toAdminMoment(current));
  }

  let saveToken: string | null;
  try {
    saveToken = await MomentRepo.updateMoment(
      context.db,
      input.id,
      {
        text: input.data.text === undefined ? undefined : next.text,
        mediaIds: input.data.images === undefined ? undefined : next.mediaIds,
        video: input.data.video === undefined ? undefined : next.video,
      },
      { saveToken: input.saveToken },
    );
  } catch (error) {
    if (!MomentRepo.isMomentImageGone(error)) throw error;
    const recheck = await resolveContent(context, input.data, stored);
    if (recheck.error) return recheck;
    throw error;
  }
  if (saveToken === null) {
    return editConflictOrNotFound(context.db, input.id);
  }

  await invalidate.momentChanged(context, {
    id: input.id,
    navigationChanged: false,
  });
  const updated = await MomentRepo.findMomentById(context.db, input.id);
  // Deleted right after the save: answer as if the save had come second.
  if (!updated) return err({ reason: "MOMENT_NOT_FOUND" });
  return ok(toAdminMoment(updated));
}

export async function deleteMoment(
  context: ReadContext,
  input: { id: number },
) {
  if (!(await MomentRepo.deleteMoment(context.db, input.id))) {
    return err({ reason: "MOMENT_NOT_FOUND" });
  }
  await invalidate.momentChanged(context, {
    id: input.id,
    navigationChanged: !(await MomentRepo.hasMoments(context.db)),
  });
  return ok({ success: true });
}
