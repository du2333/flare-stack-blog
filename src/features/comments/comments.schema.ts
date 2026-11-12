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

/** The Admin's Comments page: what awaits a reply, or every Comment. */
export const ADMIN_COMMENT_VIEWS = ["unreplied", "all"] as const;
export type AdminCommentView = (typeof ADMIN_COMMENT_VIEWS)[number];

export const AdminCommentsInputSchema = z.strictObject({
  view: z
    .enum(ADMIN_COMMENT_VIEWS)
    .default("all")
    .describe(
      "unreplied: the visitor Comments the dashboard counts as awaiting a reply; all: every published Comment.",
    ),
  search: z
    .string()
    .trim()
    .max(200)
    .optional()
    .describe("Matches the author's name or the body, ignoring case."),
  postId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Only the Comments on this Post."),
  offset: PageOffsetSchema.optional(),
  limit: pageLimitSchema(100).optional(),
});

/** A published Comment as the Admin's Comments page lists it. */
export const AdminCommentSchema = z.object({
  id: z.number().int().positive(),
  content: z.string().nullable(),
  postId: z.number().int().positive().nullable(),
  momentId: z.number().int().positive().nullable(),
  rootId: z.number().int().positive().nullable(),
  replyToCommentId: z.number().int().positive().nullable(),
  createdAt: coercedDate,
  author: z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    image: z.string().nullable(),
    isAdmin: z.boolean(),
    muted: z.boolean(),
  }),
  /** Whom a reply answers; null for a root Comment. */
  replyToName: z.string().nullable(),
  /** The Post's public title (its draft title while it is not public), or the Moment's heading. */
  pageTitle: z.string(),
  /** The Comment's public link; null while its Post is not public. */
  commentPath: z.string().nullable(),
  /** A published Admin Comment answers it. */
  answered: z.boolean(),
  /** An Admin replied to it or marked it handled. */
  handled: z.boolean(),
  /** It is on the unreplied list the dashboard and the sidebar count. */
  awaitingReply: z.boolean(),
});

export const AdminCommentsPageSchema = z.object({
  items: z.array(AdminCommentSchema),
  /** Every Comment the view, search and filter match, not only this page's. */
  total: z.number().int().nonnegative(),
});

/** A Post that has published Comments, for the Comments page's filter. */
export const AdminCommentedPostSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  comments: z.number().int().positive(),
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
export type AdminCommentsInput = z.input<typeof AdminCommentsInputSchema>;
export type AdminComment = z.infer<typeof AdminCommentSchema>;
export type AdminCommentsPage = z.infer<typeof AdminCommentsPageSchema>;
export type AdminCommentedPost = z.infer<typeof AdminCommentedPostSchema>;
