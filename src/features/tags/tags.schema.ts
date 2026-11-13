import { z } from "zod";
import type { TagsTable } from "@/lib/db/schema";
import { atLeastOneField } from "@/lib/orpc/changes";
import { PathIdSchema } from "@/lib/orpc/path-ids";
import { hasControlCharacter } from "@/lib/unicode-text";
import { coercedDate } from "@/lib/orpc/dates";
import type { Equal, Expect } from "@/lib/type-equal";
import { StatedSaveTokenSchema } from "@/features/posts/schema/save-token.schema";

export const TagSelectSchema = z.object({
  id: z.int(),
  name: z.string(),
  createdAt: coercedDate,
});

/**
 * Fails to compile when a column of `tags` is missing from the schema or reads
 * differently. `nameKey` is left out: unique keys are the database's to
 * compare by, not part of what is read.
 */
export type TagSelectMatchesTable = Expect<
  Equal<
    z.output<typeof TagSelectSchema>,
    Omit<typeof TagsTable.$inferSelect, "nameKey">
  >
>;

export const TagWithCountSchema = TagSelectSchema.extend({
  postCount: z.number(),
});

// API Output Schemas
export const TagListItemSchema = TagSelectSchema.extend({
  postCount: z
    .number()
    .optional()
    .describe(
      "How many posts currently carry the tag, drafts included. Only returned when withCount=true.",
    ),
});

export const AdminTagWithCountSchema = TagWithCountSchema.extend({
  postCount: z
    .number()
    .describe("How many posts currently carry the tag, drafts included."),
  publicPostCount: z
    .number()
    .describe(
      "How many published posts show the tag on the public site, as of their last publish.",
    ),
});

export const DeleteTagResultSchema = z.object({ success: z.boolean() });

export const SetPostTagsResultSchema = z.object({
  saveToken: z
    .string()
    .describe(
      "The post's saveToken after the write, to state on your next save or publish.",
    ),
});

// API Input Schemas
const TagNameInputSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .refine((name) => !hasControlCharacter(name, { emoji: true }), {
    message:
      "A name cannot contain control or format characters (Unicode Cc or Cf).",
  })
  .describe(
    "Name, trimmed: not empty, at most 50 characters. It cannot contain control or format characters (Unicode Cc or Cf, such as a tab, a zero width space or a bidirectional control); a zero width joiner inside an emoji is fine. No other tag may have it, compared ignoring case and Unicode compatibility forms (NFKC, so fullwidth ＡＢＣ equals abc): that answers 409 TAG_NAME_ALREADY_EXISTS. It is stored as written.",
  );

export const CreateTagInputSchema = z.strictObject({
  name: TagNameInputSchema,
});

export const UpdateTagInputSchema = z.strictObject({
  id: PathIdSchema,
  data: atLeastOneField(
    z.strictObject({
      name: TagNameInputSchema.optional(),
    }),
  ).describe("The fields to change; at least one, or the request answers 400."),
});

export const DeleteTagInputSchema = z.strictObject({
  id: PathIdSchema,
});

export const GetTagsInputSchema = z.strictObject({
  sortBy: z.enum(["name", "createdAt", "postCount"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  withCount: z.boolean().optional(),
  publicOnly: z.boolean().optional(),
});

export const SetPostTagsInputSchema = z.strictObject({
  postId: PathIdSchema,
  tagIds: z
    .array(z.number().int().min(1))
    .describe(
      'The ids of every tag the post should carry; an empty list removes them all. Each id is a positive whole number written as a JSON number, so "95" or 1.5 answers 400. An id no tag has answers 404 TAG_NOT_FOUND. Either way nothing is written.',
    ),
  saveToken: StatedSaveTokenSchema,
});

export const GetTagsByPostIdInputSchema = z.strictObject({
  postId: PathIdSchema,
});

// Type exports
export type Tag = z.infer<typeof TagSelectSchema>;
export type CreateTagInput = z.infer<typeof CreateTagInputSchema>;
export type UpdateTagInput = z.infer<typeof UpdateTagInputSchema>;
export type DeleteTagInput = z.infer<typeof DeleteTagInputSchema>;
export type GetTagsInput = z.infer<typeof GetTagsInputSchema>;
export type SetPostTagsInput = z.infer<typeof SetPostTagsInputSchema>;
export type GetTagsByPostIdInput = z.infer<typeof GetTagsByPostIdInputSchema>;
export type TagWithCount = z.infer<typeof TagWithCountSchema>;
