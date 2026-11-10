import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  POST_REVISION_REASONS,
  POST_STATUSES,
  PostRevisionsTable,
} from "@/lib/db/schema";
import { PathIdSchema } from "@/lib/orpc/path-ids";
import { NullableJsonContentSchema } from "./json-content.schema";
import {
  ContentMarkdownOutputSchema,
  PostContentFormatSchema,
  StatedSaveTokenSchema,
} from "./posts.schema";
import { coercedDate } from "@/lib/orpc/dates";

export const PostRevisionSnapshotSchema = z.object({
  title: z.string(),
  summary: z.string().nullable(),
  slug: z.string(),
  status: z.enum(POST_STATUSES),
  publishedAt: z.string().nullable(),
  contentJson: NullableJsonContentSchema,
  tagIds: z.array(z.number().int()),
  categoryId: z.number().int().nullable().default(null),
  coverMediaId: z.number().int().nullable().default(null),
});

export const PostRevisionReasonSchema = z
  .enum(POST_REVISION_REASONS)
  .describe(
    "Why the revision was taken. publish: taken when the post is published. restore_backup: the draft saved automatically before restoring a revision or discarding Unpublished Changes, so it can be restored. auto: legacy autosave revisions from older versions; new ones are no longer taken.",
  );

export const PostRevisionSelectSchema = createSelectSchema(PostRevisionsTable, {
  createdAt: coercedDate,
  snapshotJson: PostRevisionSnapshotSchema,
  reason: PostRevisionReasonSchema,
});

export const PostRevisionSchema = PostRevisionSelectSchema.extend({
  snapshotJson: PostRevisionSnapshotSchema.extend({
    contentJson: NullableJsonContentSchema.optional().describe(
      "The body as TipTap JSON. Not returned when the request asks for contentFormat=markdown.",
    ),
    contentMarkdown: ContentMarkdownOutputSchema,
  }),
});

export const ListPostRevisionsInputSchema = z.strictObject({
  postId: PathIdSchema,
});

export const FindPostRevisionByIdInputSchema = z.strictObject({
  postId: PathIdSchema,
  revisionId: PathIdSchema,
});

export const GetPostRevisionInputSchema =
  FindPostRevisionByIdInputSchema.extend({
    contentFormat: PostContentFormatSchema,
  });

const CreatePostRevisionInputSchema = z.object({
  postId: z.number(),
  reason: PostRevisionReasonSchema.optional(),
});

export const RestorePostRevisionInputSchema = z.strictObject({
  postId: PathIdSchema,
  revisionId: PathIdSchema,
  saveToken: StatedSaveTokenSchema.describe(
    "The saveToken of the draft you read and mean to replace. If the post was saved since, nothing is written, not even the revision of the current draft, and the response is 409 EDIT_CONFLICT with the current token in data.saveToken. Omit it to restore over whatever the draft is now; the restore still answers 409 EDIT_CONFLICT if a save lands while it runs, since that save would not be in the revision it keeps of the draft.",
  ),
});

export const DeletePostRevisionsInputSchema = z.strictObject({
  postId: PathIdSchema,
  revisionIds: z.array(z.number().int()).min(1),
});

export const PostRevisionListItemSchema = PostRevisionSelectSchema.pick({
  id: true,
  postId: true,
  reason: true,
  snapshotHash: true,
  restoredFromRevisionId: true,
  createdAt: true,
}).extend({
  title: z.string(),
  summary: z.string().nullable(),
  contentLength: z
    .number()
    .int()
    .describe(
      "Characters of text in the revision's body, not counting whitespace.",
    ),
});

export type PostRevisionSnapshot = z.infer<typeof PostRevisionSnapshotSchema>;

/**
 * A Post Revision's snapshot, or null when it is not a valid one. The body
 * is returned as stored, not as parsed: parsing rebuilds every node with its
 * keys in the schema's order, so a body stored in another order, as Markdown
 * writes once stored it, would no longer hash like the draft it was taken
 * from, and restoring it would write a draft that differs from that one.
 */
export function parseRevisionSnapshot(
  snapshotJson: unknown,
): PostRevisionSnapshot | null {
  const parsed = PostRevisionSnapshotSchema.safeParse(snapshotJson);
  if (!parsed.success) return null;
  return {
    ...parsed.data,
    contentJson: (snapshotJson as PostRevisionSnapshot).contentJson,
  };
}

export type ListPostRevisionsInput = z.infer<
  typeof ListPostRevisionsInputSchema
>;
export type FindPostRevisionByIdInput = z.infer<
  typeof FindPostRevisionByIdInputSchema
>;
export type CreatePostRevisionInput = z.infer<
  typeof CreatePostRevisionInputSchema
>;
export type RestorePostRevisionInput = z.infer<
  typeof RestorePostRevisionInputSchema
>;
export type DeletePostRevisionsInput = z.infer<
  typeof DeletePostRevisionsInputSchema
>;
export type CreatePostRevisionResult = {
  created: boolean;
  revision: z.infer<typeof PostRevisionSelectSchema> | null;
  skipReason?: "UNCHANGED" | "RATE_LIMITED";
};
