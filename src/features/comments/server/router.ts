import { lazy, type Route } from "@orpc/server";
import {
  CreateCommentInputSchema,
  CreateMomentCommentInputSchema,
  DeleteCommentInputSchema,
  GetCommentsByMomentIdInputSchema,
  GetCommentsByPostIdInputSchema,
  GetMomentRepliesByRootIdInputSchema,
  GetMomentThreadByCommentIdInputSchema,
  GetMyCommentsInputSchema,
  GetRepliesByRootIdInputSchema,
  GetRepliesResponseSchema,
  GetRootCommentsResponseSchema,
  GetThreadByCommentIdInputSchema,
  MyCommentSchema,
  RootCommentWithReplyCountSchema,
} from "@/features/comments/comments.schema";
import { z } from "zod";
import * as CommentService from "@/features/comments/comments.service";
import {
  authProcedure,
  optionalSessionProcedure,
  rateLimitErrors,
  turnstileErrors,
  turnstileMiddleware,
  withRateLimit,
} from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";
import { commentErrors } from "./errors";

// A Comment is on a Post or a Moment (ADR 0037). Each has the same four
// procedures under its own path, built here once and run by the same
// service; only the route and the input's id differ.

type RouteText = Pick<Route, "summary" | "description">;
type RoutePath = `/${string}`;

function rootsProcedure<
  TInput extends
    | typeof GetCommentsByPostIdInputSchema
    | typeof GetCommentsByMomentIdInputSchema,
>(path: RoutePath, input: TInput, text: RouteText) {
  return optionalSessionProcedure
    .route({ method: "GET", path, ...text, tags: ["Comments"] })
    .input(input)
    .output(GetRootCommentsResponseSchema)
    .handler(({ context, input }) =>
      CommentService.getRootComments(context, input),
    );
}

function repliesProcedure<
  TInput extends
    | typeof GetRepliesByRootIdInputSchema
    | typeof GetMomentRepliesByRootIdInputSchema,
>(path: RoutePath, input: TInput, text: RouteText) {
  return optionalSessionProcedure
    .route({ method: "GET", path, ...text, tags: ["Comments"] })
    .input(input)
    .output(GetRepliesResponseSchema)
    .handler(({ context, input }) =>
      CommentService.getRepliesByRootId(context, input),
    );
}

function threadProcedure<
  TInput extends
    | typeof GetThreadByCommentIdInputSchema
    | typeof GetMomentThreadByCommentIdInputSchema,
>(path: RoutePath, input: TInput, text: RouteText) {
  return optionalSessionProcedure
    .errors({ COMMENT_NOT_FOUND: commentErrors.COMMENT_NOT_FOUND })
    .route({ method: "GET", path, ...text, tags: ["Comments"] })
    .input(input)
    .output(RootCommentWithReplyCountSchema)
    .handler(({ context, input, errors }) =>
      unwrapResult(CommentService.getThreadByCommentId(context, input), {
        COMMENT_NOT_FOUND: () => {
          throw errors.COMMENT_NOT_FOUND();
        },
      }),
    );
}

function createProcedure<
  TInput extends
    | typeof CreateCommentInputSchema
    | typeof CreateMomentCommentInputSchema,
>(path: RoutePath, input: TInput, text: RouteText) {
  return authProcedure
    .errors({ ...rateLimitErrors, ...turnstileErrors })
    .use(
      withRateLimit({ capacity: 10, interval: "1m", key: "comments:create" }),
    )
    .use(turnstileMiddleware)
    .errors(commentErrors)
    .route({ method: "POST", path, ...text, tags: ["Comments"] })
    .input(input)
    .handler(({ context, input, errors }) =>
      unwrapResult(CommentService.createComment(context, input), {
        ROOT_COMMENT_NOT_FOUND: () => {
          throw errors.ROOT_COMMENT_NOT_FOUND();
        },
        INVALID_ROOT_ID: () => {
          throw errors.INVALID_ROOT_ID();
        },
        ROOT_COMMENT_POST_MISMATCH: () => {
          throw errors.ROOT_COMMENT_POST_MISMATCH();
        },
        REPLY_TO_COMMENT_NOT_FOUND: () => {
          throw errors.REPLY_TO_COMMENT_NOT_FOUND();
        },
        REPLY_TO_COMMENT_ROOT_MISMATCH: () => {
          throw errors.REPLY_TO_COMMENT_ROOT_MISMATCH();
        },
        ROOT_COMMENT_CANNOT_HAVE_REPLY_TO: () => {
          throw errors.ROOT_COMMENT_CANNOT_HAVE_REPLY_TO();
        },
        POST_NOT_FOUND: () => {
          throw errors.POST_NOT_FOUND();
        },
        POST_NOT_PUBLISHED: () => {
          throw errors.POST_NOT_PUBLISHED();
        },
        MOMENT_NOT_FOUND: () => {
          throw errors.MOMENT_NOT_FOUND();
        },
        USER_MUTED: () => {
          throw errors.USER_MUTED();
        },
        NAME_REQUIRED: () => {
          throw errors.NAME_REQUIRED();
        },
      }),
    );
}

// ==================== on a Post ====================

const roots = rootsProcedure(
  "/posts/{postId}/comments",
  GetCommentsByPostIdInputSchema,
  {
    summary: "List root comments on a post",
    description:
      "Returns visible root threads with reply previews. Offset and limit paginate root threads, including deleted roots that still have published replies. Total counts all published roots and replies on the post, excluding deleted placeholders; it must not be used to calculate root pagination.",
  },
);

const replies = repliesProcedure(
  "/posts/{postId}/comments/{rootId}/replies",
  GetRepliesByRootIdInputSchema,
  { summary: "List replies in a comment thread" },
);

const thread = threadProcedure(
  "/posts/{postId}/comments/{id}/thread",
  GetThreadByCommentIdInputSchema,
  { summary: "Load the visible comment thread containing a comment" },
);

const create = createProcedure(
  "/posts/{postId}/comments",
  CreateCommentInputSchema,
  { summary: "Create a comment" },
);

// ==================== on a Moment ====================

const momentRoots = rootsProcedure(
  "/moments/{momentId}/comments",
  GetCommentsByMomentIdInputSchema,
  {
    summary: "List root comments on a moment",
    description:
      "As for a post: visible root threads with reply previews, paginated by root thread; total counts all published roots and replies on the Moment, excluding deleted placeholders. A Moment that does not exist has none.",
  },
);

const momentReplies = repliesProcedure(
  "/moments/{momentId}/comments/{rootId}/replies",
  GetMomentRepliesByRootIdInputSchema,
  { summary: "List replies on a moment" },
);

const momentThread = threadProcedure(
  "/moments/{momentId}/comments/{id}/thread",
  GetMomentThreadByCommentIdInputSchema,
  {
    summary: "Load a comment thread on a moment",
    description:
      "Resolves a comment link, /moments/{momentId}?comment={id}. Answers 404 COMMENT_NOT_FOUND when the comment is not on the Moment or its thread is not shown.",
  },
);

const momentCreate = createProcedure(
  "/moments/{momentId}/comments",
  CreateMomentCommentInputSchema,
  {
    summary: "Comment on a moment",
    description:
      "Any existing Moment takes comments (404 MOMENT_NOT_FOUND otherwise); Muted Users are refused as on a post. A reply names its thread with rootId, on the same Moment, and the comment it answers with replyToCommentId.",
  },
);

// ==================== either ====================

const remove = authProcedure
  .errors(rateLimitErrors)
  .use(withRateLimit({ capacity: 10, interval: "1m", key: "comments:delete" }))
  .errors(commentErrors)
  .route({
    method: "DELETE",
    path: "/comments/{id}",
    summary: "Delete own comment",
    tags: ["Comments"],
  })
  .input(DeleteCommentInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(CommentService.deleteComment(context, input), {
      COMMENT_NOT_FOUND: () => {
        throw errors.COMMENT_NOT_FOUND();
      },
      PERMISSION_DENIED: () => {
        throw errors.FORBIDDEN();
      },
    }),
  );

const mine = authProcedure
  .route({
    method: "GET",
    path: "/me/comments",
    summary: "List the current user's comments",
    description:
      "Newest first, on Posts and Moments. Each says where it is: postId or momentId, a Moment's momentTitle, and its public commentPath.",
    tags: ["Comments"],
  })
  .input(GetMyCommentsInputSchema)
  .output(z.array(MyCommentSchema))
  .handler(({ context, input }) =>
    CommentService.getMyComments(context, input),
  );

export default {
  roots,
  replies,
  thread,
  create,
  moment: {
    roots: momentRoots,
    replies: momentReplies,
    thread: momentThread,
    create: momentCreate,
  },
  remove,
  mine,
  // Loaded on the first request under the prefix; public calls never load it.
  admin: lazy(() => import("./admin-router"), { prefix: "/admin/comments" }),
};
