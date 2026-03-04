import { createServerFn } from "@tanstack/react-start";
import {
  DeleteCommentInputSchema,
  GetAllCommentsInputSchema,
  GetUserStatsInputSchema,
  ModerateCommentInputSchema,
} from "@/features/comments/comments.schema";
import * as CommentService from "@/features/comments/comments.service";
import { adminMiddleware } from "@/lib/middlewares";

// Admin API - Get all comments with filters
export const getAllCommentsFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(GetAllCommentsInputSchema)
  .handler(
    async ({ data, context }) =>
      await CommentService.getAllComments(context, data),
  );

// Admin API - Moderate a comment (approve/reject)
export const moderateCommentFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(ModerateCommentInputSchema)
  .handler(
    async ({ data, context }) =>
      await CommentService.moderateComment(
        context,
        data,
        context.session.user.id,
      ),
  );

// Admin API - Hard delete a comment
export const adminDeleteCommentFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(DeleteCommentInputSchema)
  .handler(
    async ({ data, context }) =>
      await CommentService.adminDeleteComment(context, data),
  );

// Admin API - Get user stats for hover card
export const getUserStatsFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(GetUserStatsInputSchema)
  .handler(
    async ({ data, context }) =>
      await CommentService.getUserCommentStats(context, data.userId),
  );
