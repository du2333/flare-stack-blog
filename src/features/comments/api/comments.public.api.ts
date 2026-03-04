import { createServerFn } from "@tanstack/react-start";
import {
  CreateCommentInputSchema,
  DeleteCommentInputSchema,
  GetCommentsByPostIdInputSchema,
  GetMyCommentsInputSchema,
  GetRepliesByRootIdInputSchema,
} from "@/features/comments/comments.schema";
import * as CommentService from "@/features/comments/comments.service";
import {
  authMiddleware,
  createRateLimitMiddleware,
  sessionMiddleware,
  turnstileMiddleware,
} from "@/lib/middlewares";

// Public API - Get root comments by post ID (published + viewer's pending)
export const getRootCommentsByPostIdFn = createServerFn()
  .middleware([sessionMiddleware])
  .inputValidator(GetCommentsByPostIdInputSchema)
  .handler(async ({ data, context }) => {
    const session = context.session;

    const result = await CommentService.getRootCommentsByPostId(context, {
      ...data,
      viewerId: session?.user.id,
    });

    return result;
  });

// Public API - Get replies by root ID (published + viewer's pending)
export const getRepliesByRootIdFn = createServerFn()
  .middleware([sessionMiddleware])
  .inputValidator(GetRepliesByRootIdInputSchema)
  .handler(async ({ data, context }) => {
    const session = context.session;

    const result = await CommentService.getRepliesByRootId(context, {
      ...data,
      viewerId: session?.user.id,
    });

    return result;
  });

// Authed User APIs
export const createCommentFn = createServerFn({
  method: "POST",
})
  .middleware([
    createRateLimitMiddleware({
      capacity: 10,
      interval: "1m",
      key: "comments:create",
    }),
    turnstileMiddleware,
    authMiddleware,
  ])
  .inputValidator(CreateCommentInputSchema)
  .handler(
    async ({ data, context }) =>
      await CommentService.createComment(context, data),
  );

export const deleteCommentFn = createServerFn({
  method: "POST",
})
  .middleware([
    createRateLimitMiddleware({
      capacity: 10,
      interval: "1m",
      key: "comments:delete",
    }),
    authMiddleware,
  ])
  .inputValidator(DeleteCommentInputSchema)
  .handler(
    async ({ data, context }) =>
      await CommentService.deleteComment(context, data),
  );

export const getMyCommentsFn = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(GetMyCommentsInputSchema)
  .handler(
    async ({ data, context }) =>
      await CommentService.getMyComments(context, data),
  );
