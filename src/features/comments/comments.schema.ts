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

/**
 * The Post or the Moment a public comment call is about, named in its path
 * (ADR 0037). The Post and Moment procedures take the same input around it;
 * every rule is the same for both, except that a Post takes Comments only
 * while it has a Public Content Snapshot.
 */
const postTarget = { postId: PathIdSchema };
const momentTarget = { momentId: PathIdSchema };
type CommentTargetShape = typeof postTarget | typeof momentTarget;

const pageFields = {
  offset: PageOffsetSchema.optional(),
  limit: pageLimitSchema(100).optional(),
};

function rootsInput<T extends CommentTargetShape>(target: T) {
  return z.object({ ...target, ...pageFields });
}

function repliesInput<T extends CommentTargetShape>(target: T) {
  return z.object({ ...target, rootId: PathIdSchema, ...pageFields });
}

function threadInput<T extends CommentTargetShape>(target: T) {
  return z.object({ ...target, id: PathIdSchema });
}

// Authed User API Schemas
const CommentBodySchema = z.string().trim().min(1);

function createInput<T extends CommentTargetShape>(target: T) {
  return z.object({
    ...target,
    content: CommentBodySchema,
    rootId: z.number().optional(),
    replyToCommentId: z.number().optional(),
  });
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
export const GetCommentsByPostIdInputSchema = rootsInput(postTarget);
export const GetCommentsByMomentIdInputSchema = rootsInput(momentTarget);

export const GetRepliesByRootIdInputSchema = repliesInput(postTarget);
export const GetMomentRepliesByRootIdInputSchema = repliesInput(momentTarget);

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

export const CreateCommentInputSchema = createInput(postTarget);
export const CreateMomentCommentInputSchema = createInput(momentTarget);

export const DeleteCommentInputSchema = z.object({
  id: PathIdSchema,
});

export const GetThreadByCommentIdInputSchema = threadInput(postTarget);
export const GetMomentThreadByCommentIdInputSchema = threadInput(momentTarget);

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
// A Post's or a Moment's: the services take either.
export type GetRootCommentsInput =
  | z.infer<typeof GetCommentsByPostIdInputSchema>
  | z.infer<typeof GetCommentsByMomentIdInputSchema>;
export type GetRepliesByRootIdInput =
  | z.infer<typeof GetRepliesByRootIdInputSchema>
  | z.infer<typeof GetMomentRepliesByRootIdInputSchema>;
export type GetThreadByCommentIdInput =
  | z.infer<typeof GetThreadByCommentIdInputSchema>
  | z.infer<typeof GetMomentThreadByCommentIdInputSchema>;
export type CreateCommentInput =
  | z.infer<typeof CreateCommentInputSchema>
  | z.infer<typeof CreateMomentCommentInputSchema>;
export type DeleteCommentInput = z.infer<typeof DeleteCommentInputSchema>;
export type GetMyCommentsInput = z.infer<typeof GetMyCommentsInputSchema>;
export type MyComment = z.infer<typeof MyCommentSchema>;
export type RootCommentWithReplyCount = z.infer<
  typeof RootCommentWithReplyCountSchema
>;
export type CommentWithUser = z.infer<typeof CommentWithUserSchema>;
