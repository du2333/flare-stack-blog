import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { MediaTable, POST_STATUSES } from "@/lib/db/schema";
import { MEDIA_NAME_MAX_LENGTH } from "@/features/media/utils/media.utils";
import { IdCursorSchema, pageLimitSchema } from "@/lib/orpc/pagination";
import { coercedDate } from "@/lib/orpc/dates";
import { hasControlCharacter } from "@/lib/unicode-text";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
/** Why a file is refused with MEDIA_INVALID. */
export const MEDIA_INVALID_DETAILS = [
  "TYPE_MISMATCH",
  "TYPE_UNRECOGNIZED",
  "EMPTY",
  "TOO_LARGE",
  "TYPE_CHANGED",
] as const;
export type MediaInvalidDetail = (typeof MEDIA_INVALID_DETAILS)[number];

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

export const MediaSelectSchema = createSelectSchema(MediaTable, {
  key: z
    .string()
    .describe(
      "Identifies the file. It is the {key} of the media routes, and the file is served at /images/{key}.",
    ),
  url: z
    .string()
    .describe(
      "Address of the file. Use it as the src of an image in a post body. Replacing the file adds a new v query to it so pages that show it load the new file; addresses already in posts keep working and show the new file too.",
    ),
  width: z.number().int().nullable().describe("Pixels. Null when unknown."),
  height: z.number().int().nullable().describe("Pixels. Null when unknown."),
  sizeInBytes: z.number().int(),
  createdAt: coercedDate,
});

export const MediaListItemSchema = MediaSelectSchema.extend({
  postCount: z
    .number()
    .describe(
      "How many posts use the image in their body or as their cover, in the draft or the published version. A post that only has a Post Revision using the image is not counted here, see revisionOnlyPostCount.",
    ),
  revisionOnlyPostCount: z
    .number()
    .describe(
      "How many posts use the image only in a Post Revision, not in the draft or the published version. Restoring such a revision brings the image back, so an image with postCount, revisionOnlyPostCount or momentCount above 0 cannot be deleted.",
    ),
  momentCount: z
    .number()
    .describe("How many Moments show the image among their images."),
  isCover: z
    .boolean()
    .describe("True when a post uses the image as its cover."),
});

export const MediaListPageSchema = z.object({
  items: z.array(MediaListItemSchema),
  nextCursor: z
    .number()
    .nullable()
    .describe("Pass as cursor to get the next page. Null on the last page."),
});

export const MediaStatsSchema = z.object({
  totalCount: z.number().int(),
  unusedCount: z
    .number()
    .int()
    .describe(
      "Images no post uses (draft, published version or Post Revision), no Moment shows and no Admin has as an avatar.",
    ),
  totalBytes: z.number().int(),
});

export const LinkedPostSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  slug: z.string(),
  status: z.enum(POST_STATUSES),
  isCover: z
    .boolean()
    .describe("True when the post uses the image as its cover."),
  revisionsOnly: z
    .boolean()
    .describe(
      "True when only Post Revisions of the post use the image, not its draft or published version. Restoring such a revision brings the image back, so it still counts as in use.",
    ),
});

export const LinkedMomentSchema = z.object({
  id: z.number().int(),
  title: z
    .string()
    .describe(
      "The start of the Moment's text on one line, or 图片动态 / Image moment (by the request's language) when it has no text.",
    ),
  postedAt: coercedDate.describe("When the Moment was first posted."),
});

export const DeleteMediaResultSchema = z.object({ success: z.boolean() });

export const DeleteUnusedMediaResultSchema = z.object({
  data: z.object({
    count: z.number().int().describe("How many images were deleted."),
  }),
  error: z.null(),
});

export const MediaKeyInputSchema = z.strictObject({
  key: z.string(),
});

/** A Media's file name, held to the rules of a Tag or Category name. */
const MediaNameInputSchema = z
  .string()
  .trim()
  .min(1)
  .max(MEDIA_NAME_MAX_LENGTH)
  .refine((name) => !hasControlCharacter(name, { emoji: true }), {
    message:
      "A name cannot contain control or format characters (Unicode Cc or Cf).",
  });

export const UpdateMediaNameInputSchema = z.strictObject({
  key: z.string().min(1),
  name: MediaNameInputSchema.describe(
    `The new file name, trimmed: not empty, at most ${MEDIA_NAME_MAX_LENGTH} characters. It cannot contain control or format characters (Unicode Cc or Cf, such as NUL, a tab, a zero width space or a bidirectional control); a zero width joiner inside an emoji is fine. It is stored as written; the key and address do not change.`,
  ),
});

export const GetMediaListInputSchema = z.strictObject({
  cursor: IdCursorSchema.optional(),
  limit: pageLimitSchema(100).optional(),
  search: z.string().optional(),
  unusedOnly: z.boolean().optional(),
});

export const ImportMediaUrlInputSchema = z.strictObject({
  url: z.string().min(1),
  name: MediaNameInputSchema.optional().describe(
    "File name for the imported image, held to the same rules as a rename. Omit it to take the name from the last part of the address. Either way the name ends in the extension of the image type that was downloaded (a name with another image extension has it replaced), and a name with nothing usable is image.<extension>.",
  ),
});

export type UpdateMediaNameInput = z.infer<typeof UpdateMediaNameInputSchema>;
export type GetMediaListInput = z.infer<typeof GetMediaListInputSchema>;
