import { z } from "zod";
import type { MomentVideo } from "@/lib/db/schema";
import { atLeastOneField } from "@/lib/orpc/changes";
import { coercedDate } from "@/lib/orpc/dates";
import { PathIdSchema } from "@/lib/orpc/path-ids";
import {
  LATEST_MOMENTS_COUNT,
  MOMENT_IMAGES_MAX,
  MOMENT_TEXT_MAX_LENGTH,
  MOMENTS_PER_PAGE,
} from "@/features/moments/utils/moment-rules";

// ==================== what readers get ====================

export const MomentImageSchema = z.object({
  key: z
    .string()
    .describe(
      "The Media key. Its path, /images/{key}, is how a write names the image.",
    ),
  url: z
    .string()
    .describe(
      "Address of the image file, the Media's url: /images/{key}, with a v query once the file was replaced.",
    ),
  width: z.number().int().nullable().describe("Pixels. Null when unknown."),
  height: z.number().int().nullable().describe("Pixels. Null when unknown."),
});

export const MomentVideoSchema = z
  .object({
    provider: z
      .enum(["bilibili", "youtube", "direct"])
      .describe(
        "bilibili or youtube, played in that site's player from videoId; direct for a Direct Video, a video file at src played by the browser itself.",
      ),
    videoId: z
      .string()
      .nullable()
      .describe(
        "A Bilibili BV or av ID, or an 11-character YouTube ID. Null for a Direct Video.",
      ),
    page: z
      .number()
      .int()
      .nullable()
      .describe(
        "The Bilibili part (分P), from 2; null for the first part, YouTube and a Direct Video.",
      ),
    start: z
      .number()
      .int()
      .nullable()
      .describe(
        "Where playback starts, in seconds, from the link's t or start; null for the start.",
      ),
    title: z.string().nullable(),
    cover: z
      .string()
      .nullable()
      .describe(
        "The cover: Bilibili's, on its image CDN, or a Direct Video's poster. Null when there is none; a YouTube video's still has a fixed address from videoId.",
      ),
    duration: z
      .number()
      .int()
      .nullable()
      .describe("Length in seconds. Null when unknown."),
    src: z
      .string()
      .nullable()
      .describe(
        "A Direct Video's file, an https address. Null for Bilibili and YouTube.",
      ),
    pageUrl: z
      .string()
      .nullable()
      .describe(
        "The https page a Direct Video was found on, linked under the player. Null when there is none.",
      ),
  })
  .describe(
    "The Moment's video, with the attributes of a video block in a post body. The title, cover and length of a Bilibili or YouTube video were looked up when it was written.",
  ) satisfies z.ZodType<MomentVideo>;

export const PublicMomentSchema = z.object({
  id: z.number().int(),
  text: z
    .string()
    .describe(
      "Plain text, possibly several lines; empty when the Moment is only images or a video. Readers see web addresses in it as links.",
    ),
  images: z
    .array(MomentImageSchema)
    .describe(
      "The images, in order; empty when the Moment has a video or none.",
    ),
  video: MomentVideoSchema.nullable().describe(
    "The video, or null. A Moment never has both images and a video.",
  ),
  postedAt: coercedDate.describe(
    "When the Moment was first posted. Edits never change it.",
  ),
  updatedAt: coercedDate.describe("When the Moment was last written."),
  commentCount: z
    .number()
    .int()
    .nonnegative()
    .describe(
      "Published Comments on the Moment, roots and replies; deleted ones are not counted.",
    ),
});

export const MomentSaveTokenSchema = z
  .string()
  .describe(
    "Opaque token that every save of the Moment replaces. State it as saveToken when saving so the save is refused with 409 EDIT_CONFLICT if the Moment was saved since you read it.",
  );

export const AdminMomentSchema = PublicMomentSchema.extend({
  saveToken: MomentSaveTokenSchema,
});

export const MomentListInputSchema = z.object({
  page: z
    .number()
    .int()
    .min(1)
    .max(1_000_000)
    .default(1)
    .describe(
      "The page, from 1. A page past the last answers the last page, as page says.",
    ),
});

export const MomentListResponseSchema = z.object({
  items: z.array(PublicMomentSchema),
  page: z
    .number()
    .int()
    .positive()
    .describe("The page answered: the one asked for, or the last."),
  totalPages: z
    .number()
    .int()
    .positive()
    .describe(`Pages of ${MOMENTS_PER_PAGE}; 1 when there are no Moments.`),
});

export const LatestMomentsSchema = z
  .array(PublicMomentSchema)
  .max(LATEST_MOMENTS_COUNT);

export const MomentsExistSchema = z.object({
  exists: z.boolean().describe("True once at least one Moment exists."),
});

export const MomentIdInputSchema = z.strictObject({ id: PathIdSchema });

// ==================== what the Admin writes ====================

const TEXT_RULES = `Plain text of at most ${MOMENT_TEXT_MAX_LENGTH} characters, counted in Unicode code points (an emoji or a CJK character is one), after leading and trailing whitespace is removed. Line breaks and tabs are kept; any other control or format character (Unicode Cc or Cf, such as NUL, a zero width space or a bidirectional control) answers 400 MOMENT_TEXT_INVALID, except a zero width joiner inside an emoji. Longer text answers 400 MOMENT_TEXT_TOO_LONG. Web addresses are shown as links. An empty string means no text.`;

const MomentTextInputSchema = z.string().describe(TEXT_RULES);

const MomentImagesInputSchema = z
  .array(z.string().max(4096))
  .describe(
    `The images, in order: up to ${MOMENT_IMAGES_MAX} Media paths, /images/{key} (alone or on the blog's own address). Each must be existing Media, or the save answers 400 MOMENT_IMAGE_NOT_FOUND; anything else, such as an image on another site, answers 400 MOMENT_IMAGE_INVALID. Upload an image as Media first. More than ${MOMENT_IMAGES_MAX} answers 400 MOMENT_TOO_MANY_IMAGES. An empty array means no images.`,
  );

const ProviderVideoInputSchema = z
  .strictObject({
    url: z
      .string()
      .max(4096)
      .describe(
        "A Bilibili or YouTube video's page or player link, such as https://www.bilibili.com/video/BV…/?p=2 or https://youtu.be/…?t=90; the part (p) and start time (t) are kept. A b23.tv short link is refused: open it and give the address it leads to.",
      ),
  })
  .describe(
    "A Bilibili or YouTube video. The server looks up its title, cover and length once, when it is written, and leaves them empty when the site does not answer; writing the same video again keeps what was found.",
  );

const DirectVideoInputSchema = z
  .strictObject({
    src: z.string().max(4096).describe("The video file, an https address."),
    poster: z
      .string()
      .max(4096)
      .nullable()
      .optional()
      .describe("The image shown before it plays, an https address."),
    title: z.string().max(4096).nullable().optional(),
    page: z
      .string()
      .max(4096)
      .nullable()
      .optional()
      .describe(
        "The https page the video was found on, linked under the player.",
      ),
    duration: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "The file's length in seconds, as read from the file; the server cannot read it. Stored as given. Left out, the length the Moment's video already had is kept while src stays the same, else it is unknown.",
      ),
  })
  .describe(
    "A Direct Video: a video file at any https address, played by the reader's browser. The server requests none of these addresses and stores them as given, so check them first. Every address must be https without a user name or password, or the save answers 400 MOMENT_VIDEO_INVALID.",
  );

const MomentVideoInputSchema = z
  .union([ProviderVideoInputSchema, DirectVideoInputSchema])
  .describe(
    "One video: { url } for Bilibili or YouTube, or { src, poster?, title?, page?, duration? } for a Direct Video. A Moment with a video has no images.",
  );

export const CreateMomentInputSchema = z.strictObject({
  text: MomentTextInputSchema.optional(),
  images: MomentImagesInputSchema.optional(),
  video: MomentVideoInputSchema.optional(),
});

const MomentChangesSchema = atLeastOneField(
  z.strictObject({
    text: MomentTextInputSchema.optional(),
    images: MomentImagesInputSchema.optional(),
    video: MomentVideoInputSchema.nullable()
      .optional()
      .describe(
        "One video, as on create, or null for none. A Moment with a video has no images.",
      ),
  }),
);

export const UpdateMomentInputSchema = z.strictObject({
  id: PathIdSchema,
  data: MomentChangesSchema.describe(
    "The fields to change; at least one, or the request answers 400. A field left out keeps its value. To swap images for a video, send images: [] with the video, and video: null with images for the other way.",
  ),
  saveToken: z
    .string()
    .optional()
    .describe(
      "The saveToken from your latest read or write of this Moment. If it was saved since, nothing is written and the response is 409 EDIT_CONFLICT with the current token in data.saveToken: read it again before deciding what to write. Omit it to write unconditionally.",
    ),
});

export const DeleteMomentResultSchema = z.object({ success: z.boolean() });

export const MomentEditConflictDataSchema = z.object({
  saveToken: z
    .string()
    .describe(
      "The Moment's current saveToken. Read the Moment again to see what changed; state this token only to overwrite it on purpose.",
    ),
});

export type PublicMoment = z.infer<typeof PublicMomentSchema>;
export type AdminMoment = z.infer<typeof AdminMomentSchema>;
export type MomentImage = z.infer<typeof MomentImageSchema>;
export type MomentVideoInput = z.infer<typeof MomentVideoInputSchema>;
export type CreateMomentInput = z.infer<typeof CreateMomentInputSchema>;
export type UpdateMomentInput = z.infer<typeof UpdateMomentInputSchema>;
export type MomentListResponse = z.infer<typeof MomentListResponseSchema>;
