import { z } from "zod";
import {
  AdminCommentedPostSchema,
  AdminCommentsInputSchema,
  AdminCommentsPageSchema,
  CommentHandledInputSchema,
  CommentsHandledCountSchema,
} from "@/features/comments/comments.schema";
import * as CommentService from "@/features/comments/comments.service";
import { adminProcedure } from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";
import { commentErrors } from "./errors";

const markHandled = adminProcedure
  .errors({ COMMENT_NOT_FOUND: commentErrors.COMMENT_NOT_FOUND })
  .route({
    method: "PUT",
    path: "/admin/comments/{id}/handled",
    summary: "Mark a comment handled",
    description:
      "Takes the Comment off the dashboard's unreplied list without replying. An Admin reply marks the Comment it answers handled too.",
    tags: ["Admin Comments"],
  })
  .input(CommentHandledInputSchema)
  .output(z.object({ success: z.boolean() }))
  .handler(({ context, input, errors }) =>
    unwrapResult(CommentService.markCommentHandled(context, input), {
      COMMENT_NOT_FOUND: () => {
        throw errors.COMMENT_NOT_FOUND();
      },
    }),
  );

const unmarkHandled = adminProcedure
  .errors({ COMMENT_NOT_FOUND: commentErrors.COMMENT_NOT_FOUND })
  .route({
    method: "DELETE",
    path: "/admin/comments/{id}/handled",
    summary: "Unmark a handled comment",
    description:
      "Undoes marking the Comment handled. It returns to the unreplied list unless an Admin Comment still answers it.",
    tags: ["Admin Comments"],
  })
  .input(CommentHandledInputSchema)
  .output(z.object({ success: z.boolean() }))
  .handler(({ context, input, errors }) =>
    unwrapResult(CommentService.unmarkCommentHandled(context, input), {
      COMMENT_NOT_FOUND: () => {
        throw errors.COMMENT_NOT_FOUND();
      },
    }),
  );

const markAllHandled = adminProcedure
  .route({
    method: "POST",
    path: "/admin/comments/handled",
    summary: "Mark all unreplied comments handled",
    description:
      "Marks every Comment on the dashboard's unreplied list handled and returns how many it marked.",
    tags: ["Admin Comments"],
  })
  .output(CommentsHandledCountSchema)
  .handler(({ context }) =>
    CommentService.markAllUnrepliedCommentsHandled(context),
  );

const list = adminProcedure
  .errors({ POST_NOT_FOUND: commentErrors.POST_NOT_FOUND })
  .route({
    method: "GET",
    path: "/admin/comments",
    summary: "List comments",
    description:
      "Published Comments on Posts and Moments, newest first, with the total that matches. view=unreplied lists the visitor Comments awaiting a reply, the dashboard's count; view=all lists every one. search matches the author's name or the body; postId keeps one Post's.",
    tags: ["Admin Comments"],
  })
  .input(AdminCommentsInputSchema)
  .output(AdminCommentsPageSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(CommentService.listAdminComments(context, input), {
      POST_NOT_FOUND: () => {
        throw errors.POST_NOT_FOUND();
      },
    }),
  );

const commentedPosts = adminProcedure
  .route({
    method: "GET",
    path: "/admin/comments/posts",
    summary: "List posts with comments",
    description:
      "Every Post that has published Comments, with how many, the most recently commented first.",
    tags: ["Admin Comments"],
  })
  .output(z.array(AdminCommentedPostSchema))
  .handler(({ context }) => CommentService.listCommentedPosts(context));

export default {
  list,
  commentedPosts,
  markHandled,
  unmarkHandled,
  markAllHandled,
};
