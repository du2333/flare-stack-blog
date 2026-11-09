import { lazy } from "@orpc/server";
import {
  CreateCommentInputSchema,
  DeleteCommentInputSchema,
  GetMyCommentsInputSchema,
  GetRepliesByRootIdInputSchema,
  GetRepliesResponseSchema,
  GetRootCommentsInputSchema,
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

// A Comment is on a Post or a Moment (ADR 0037): every public comment call
// names which with exactly one of postId and momentId, in the query of a read
// and in the body of a create.
const TARGET =
  "Name the Post with postId or the Moment with momentId, exactly one of them.";

const roots = optionalSessionProcedure
  .route({
    method: "GET",
    path: "/comments",
    summary: "List root comments on a post or a moment",
    description: `Returns visible root threads with reply previews. ${TARGET} Offset and limit paginate root threads, including deleted roots that still have published replies. Total counts all published roots and replies on the Post or Moment, excluding deleted placeholders; it must not be used to calculate root pagination. A Post without a published version, or a Moment that does not exist, has no comments.`,
    tags: ["Comments"],
  })
  .input(GetRootCommentsInputSchema)
  .output(GetRootCommentsResponseSchema)
  .handler(({ context, input }) =>
    CommentService.getRootComments(context, input),
  );

const replies = optionalSessionProcedure
  .route({
    method: "GET",
    path: "/comments/{rootId}/replies",
    summary: "List replies in a comment thread",
    description: `${TARGET} The root comment must be on it; otherwise the list is empty.`,
    tags: ["Comments"],
  })
  .input(GetRepliesByRootIdInputSchema)
  .output(GetRepliesResponseSchema)
  .handler(({ context, input }) =>
    CommentService.getRepliesByRootId(context, input),
  );

const thread = optionalSessionProcedure
  .errors({ COMMENT_NOT_FOUND: commentErrors.COMMENT_NOT_FOUND })
  .route({
    method: "GET",
    path: "/comments/{id}/thread",
    summary: "Load the visible comment thread containing a comment",
    description: `${TARGET} Answers 404 COMMENT_NOT_FOUND when the comment is not on it or its thread is not shown. Comment links (/post/{slug}?comment={id}, /moments/{momentId}?comment={id}) are resolved with this.`,
    tags: ["Comments"],
  })
  .input(GetThreadByCommentIdInputSchema)
  .output(RootCommentWithReplyCountSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(CommentService.getThreadByCommentId(context, input), {
      COMMENT_NOT_FOUND: () => {
        throw errors.COMMENT_NOT_FOUND();
      },
    }),
  );

const create = authProcedure
  .errors({ ...rateLimitErrors, ...turnstileErrors })
  .use(withRateLimit({ capacity: 10, interval: "1m", key: "comments:create" }))
  .use(turnstileMiddleware)
  .errors(commentErrors)
  .route({
    method: "POST",
    path: "/comments",
    summary: "Create a comment",
    description: `${TARGET} A Post takes comments only while it has a published version (400 POST_NOT_PUBLISHED); a Moment, as long as it exists (404 MOMENT_NOT_FOUND otherwise). A reply names its thread with rootId, on the same Post or Moment, and the comment it answers with replyToCommentId.`,
    tags: ["Comments"],
  })
  .input(CreateCommentInputSchema)
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
  remove,
  mine,
  // Loaded on the first request under the prefix; public calls never load it.
  admin: lazy(() => import("./admin-router"), { prefix: "/admin/comments" }),
};
