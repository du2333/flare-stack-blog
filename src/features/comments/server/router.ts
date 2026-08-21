import {
  CreateCommentInputSchema,
  DeleteCommentInputSchema,
  GetAllCommentsInputSchema,
  GetCommentsByPostIdInputSchema,
  GetMyCommentsInputSchema,
  GetRepliesByRootIdInputSchema,
  GetUserStatsInputSchema,
  ModerateCommentInputSchema,
} from "@/features/comments/comments.schema";
import * as CommentService from "@/features/comments/comments.service";
import {
  adminProcedure,
  authProcedure,
  optionalSessionProcedure,
  turnstileMiddleware,
  withRateLimit,
} from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";

const commentErrors = {
  ROOT_COMMENT_NOT_FOUND: { status: 404, message: "Root comment not found." },
  INVALID_ROOT_ID: { status: 400, message: "Invalid root comment." },
  ROOT_COMMENT_POST_MISMATCH: {
    status: 400,
    message: "Root comment does not belong to this post.",
  },
  REPLY_TO_COMMENT_NOT_FOUND: {
    status: 404,
    message: "Reply target not found.",
  },
  REPLY_TO_COMMENT_ROOT_MISMATCH: {
    status: 400,
    message: "Reply target is not in this thread.",
  },
  ROOT_COMMENT_CANNOT_HAVE_REPLY_TO: {
    status: 400,
    message: "A root comment cannot reply to another comment.",
  },
  COMMENT_NOT_FOUND: { status: 404, message: "Comment not found." },
} as const;

const roots = optionalSessionProcedure
  .route({
    method: "GET",
    path: "/posts/{postId}/comments",
    summary: "List root comments on a post",
    tags: ["Comments"],
  })
  .input(GetCommentsByPostIdInputSchema)
  .handler(({ context, input }) =>
    CommentService.getRootCommentsByPostId(context, {
      ...input,
      viewerId: context.session?.user.id,
    }),
  );

const replies = optionalSessionProcedure
  .route({
    method: "GET",
    path: "/posts/{postId}/comments/{rootId}/replies",
    summary: "List replies in a comment thread",
    tags: ["Comments"],
  })
  .input(GetRepliesByRootIdInputSchema)
  .handler(({ context, input }) =>
    CommentService.getRepliesByRootId(context, {
      ...input,
      viewerId: context.session?.user.id,
    }),
  );

const create = authProcedure
  .use(withRateLimit({ capacity: 10, interval: "1m", key: "comments:create" }))
  .use(turnstileMiddleware)
  .errors(commentErrors)
  .route({
    method: "POST",
    path: "/posts/{postId}/comments",
    summary: "Create a comment",
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
    }),
  );

const remove = authProcedure
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
    tags: ["Comments"],
  })
  .input(GetMyCommentsInputSchema)
  .handler(({ context, input }) =>
    CommentService.getMyComments(context, input),
  );

const adminList = adminProcedure
  .route({
    method: "GET",
    path: "/admin/comments",
    summary: "List comments for admin",
    tags: ["Admin Comments"],
  })
  .input(GetAllCommentsInputSchema)
  .handler(({ context, input }) =>
    CommentService.getAllComments(context, input),
  );

const moderate = adminProcedure
  .errors(commentErrors)
  .route({
    method: "PATCH",
    path: "/admin/comments/{id}",
    summary: "Moderate a comment",
    tags: ["Admin Comments"],
  })
  .input(ModerateCommentInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(
      CommentService.moderateComment(context, input, context.session.user.id),
      {
        COMMENT_NOT_FOUND: () => {
          throw errors.COMMENT_NOT_FOUND();
        },
      },
    ),
  );

const adminRemove = adminProcedure
  .errors(commentErrors)
  .route({
    method: "DELETE",
    path: "/admin/comments/{id}",
    summary: "Hard-delete a comment",
    tags: ["Admin Comments"],
  })
  .input(DeleteCommentInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(CommentService.adminDeleteComment(context, input), {
      COMMENT_NOT_FOUND: () => {
        throw errors.COMMENT_NOT_FOUND();
      },
    }),
  );

const userStats = adminProcedure
  .route({
    method: "GET",
    path: "/admin/users/{userId}/stats",
    summary: "Get comment stats for a user",
    tags: ["Admin Comments"],
  })
  .input(GetUserStatsInputSchema)
  .handler(({ context, input }) =>
    CommentService.getUserCommentStats(context, input.userId),
  );

export default {
  roots,
  replies,
  create,
  remove,
  mine,
  admin: {
    list: adminList,
    moderate,
    remove: adminRemove,
    userStats,
  },
};
