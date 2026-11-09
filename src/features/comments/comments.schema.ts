import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { COMMENT_STATUSES, CommentsTable } from "@/lib/db/schema";
import { PageOffsetSchema, pageLimitSchema } from "@/lib/orpc/pagination";
import { coercedDate } from "@/lib/orpc/dates";
import { PathIdSchema } from "@/lib/orpc/path-ids";

/** A Comment as public APIs return it; when an Admin handled it stays private. */
export const CommentSelectSchema = createSelectSchema(CommentsTable, {
  postId: (schema) =>
    schema.describe("The Post the Comment is on; null for a Moment's Comment."),
  momentId: (schema) =>
    schema.describe("The Moment the Comment is on; null for a Post's Comment."),
  createdAt: coercedDate,
  updatedAt: coercedDate,
}).omit({ handledAt: true });

const ONE_TARGET =
  "Give exactly one of postId and momentId: the Post or the Moment the comments are on.";

/**
 * The Post or the Moment a public comment call is about, exactly one of them
 * (ADR 0037). Every other rule is the same for both, except that a Post takes
 * Comments only while it has a Public Content Snapshot.
 */
const commentTargetFields = {
  postId: PathIdSchema.optional().describe(
    "The Post. Give this or momentId, not both.",
  ),
  momentId: PathIdSchema.optional().describe(
    "The Moment. Give this or postId, not both.",
  ),
};

function withOneTarget<
  TSchema extends z.ZodType<{ postId?: number; momentId?: number }>,
>(schema: TSchema): TSchema {
  return schema.refine(
    (value) => (value.postId === undefined) !== (value.momentId === undefined),
    { message: ONE_TARGET, path: ["momentId"] },
  );
}

// User info schema for joined queries
const CommentUserSchema = z.object({
  id: z.string().nullable(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  role: z.string().nullable(),
  mutedAt: coercedDate.nullable(),
});

const CommentWithUserSchema = CommentSelectSchema.extend({
  user: CommentUserSchema.nullable(),
  post: z
    .object({
      title: z.string().optional().nullable(),
      slug: z.string().optional().nullable(),
    })
    .nullable()
    .optional(),
  replyToUser: z
    .object({
      id: z.string().optional().nullable(),
      name: z.string().optional().nullable(),
    })
    .nullable()
    .optional(),
});

// Public API Schemas
export const GetRootCommentsInputSchema = withOneTarget(
  z.object({
    ...commentTargetFields,
    offset: PageOffsetSchema.optional(),
    limit: pageLimitSchema(100).optional(),
  }),
);

export const GetRepliesByRootIdInputSchema = withOneTarget(
  z.object({
    ...commentTargetFields,
    rootId: PathIdSchema,
    offset: PageOffsetSchema.optional(),
    limit: pageLimitSchema(100).optional(),
  }),
);

const ReplyWithUserAndReplyToSchema = CommentWithUserSchema.extend({
  replyTo: z
    .object({
      id: z.string().nullable(),
      name: z.string().nullable(),
    })
    .nullable(),
});

export const GetRepliesResponseSchema = z.object({
  items: z.array(ReplyWithUserAndReplyToSchema),
  total: z.number(),
});

export const RootCommentWithReplyCountSchema = CommentWithUserSchema.extend({
  replyCount: z.number(),
  replies: z.array(ReplyWithUserAndReplyToSchema),
});

export const GetRootCommentsResponseSchema = z.object({
  items: z.array(RootCommentWithReplyCountSchema),
  total: z
    .number()
    .describe(
      "Total published comments on this Post or Moment, including roots and replies but excluding deleted placeholders. This is not the number of paginated root threads.",
    ),
  viewerMuted: z.boolean(),
});

// Authed User API Schemas
const CommentBodySchema = z.string().trim().min(1);

export const CreateCommentInputSchema = withOneTarget(
  z.object({
    ...commentTargetFields,
    content: CommentBodySchema,
    rootId: z.number().optional(),
    replyToCommentId: z.number().optional(),
  }),
);

export const DeleteCommentInputSchema = z.object({
  id: PathIdSchema,
});

export const GetThreadByCommentIdInputSchema = withOneTarget(
  z.object({
    ...commentTargetFields,
    id: PathIdSchema,
  }),
);

/** One of the current User's Comments, with what names the page it is on. */
export const MyCommentSchema = CommentSelectSchema.extend({
  momentTitle: z
    .string()
    .nullable()
    .describe(
      "For a Moment's Comment, the start of the Moment's text, or what the Moment holds when it has no text; null for a Post's Comment.",
    ),
  commentPath: z
    .string()
    .nullable()
    .describe(
      "The Comment's public link, /post/{slug}?comment={id} or /moments/{momentId}?comment={id}; null while its Post is not public.",
    ),
});

export const GetMyCommentsInputSchema = z.object({
  offset: PageOffsetSchema.optional(),
  limit: pageLimitSchema(100).optional(),
  status: z.enum(COMMENT_STATUSES).optional(),
});

// Admin API Schemas
export const CommentHandledInputSchema = z.strictObject({
  id: PathIdSchema,
});

export const CommentsHandledCountSchema = z.object({
  count: z.number().int().nonnegative(),
});

// Types
export type GetRootCommentsInput = z.infer<typeof GetRootCommentsInputSchema>;
export type GetRepliesByRootIdInput = z.infer<
  typeof GetRepliesByRootIdInputSchema
>;
export type GetThreadByCommentIdInput = z.infer<
  typeof GetThreadByCommentIdInputSchema
>;
export type CreateCommentInput = z.infer<typeof CreateCommentInputSchema>;
export type DeleteCommentInput = z.infer<typeof DeleteCommentInputSchema>;
export type GetMyCommentsInput = z.infer<typeof GetMyCommentsInputSchema>;
export type MyComment = z.infer<typeof MyCommentSchema>;
export type RootCommentWithReplyCount = z.infer<
  typeof RootCommentWithReplyCountSchema
>;
export type CommentWithUser = z.infer<typeof CommentWithUserSchema>;
