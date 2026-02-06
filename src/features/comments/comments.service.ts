import { renderToStaticMarkup } from "react-dom/server";
import type {
  CreateCommentInput,
  DeleteCommentInput,
  GetAllCommentsInput,
  GetCommentsByPostIdInput,
  GetMyCommentsInput,
  ModerateCommentInput,
  StartCommentModerationInput,
} from "@/features/comments/comments.schema";
import * as CommentRepo from "@/features/comments/data/comments.data";
import * as PostService from "@/features/posts/posts.service";
import { AdminNotificationEmail } from "@/features/email/templates/AdminNotificationEmail";
import { convertToPlainText } from "@/features/posts/utils/content";
import { sendReplyNotification } from "@/features/comments/workflows/helpers";
import { serverEnv } from "@/lib/env/server.env";
import { err, ok } from "@/lib/error";

// ============ Public Service Methods ============

export async function getRootCommentsByPostId(
  context: DbContext,
  data: GetCommentsByPostIdInput & { viewerId?: string },
) {
  const [items, total] = await Promise.all([
    CommentRepo.getRootCommentsByPostId(context.db, data.postId, {
      offset: data.offset,
      limit: data.limit,
      viewerId: data.viewerId,
      status: data.viewerId ? undefined : ["published", "deleted"],
    }),
    CommentRepo.getRootCommentsByPostIdCount(context.db, data.postId, {
      viewerId: data.viewerId,
      status: data.viewerId ? undefined : ["published", "deleted"],
    }),
  ]);

  // Get reply counts for each root comment
  const itemsWithReplyCount = await Promise.all(
    items.map(async (item) => {
      const replyCount = await CommentRepo.getReplyCountByRootId(
        context.db,
        data.postId,
        item.id,
        {
          viewerId: data.viewerId,
          status: data.viewerId ? undefined : ["published", "deleted"],
        },
      );
      return { ...item, replyCount };
    }),
  );

  return { items: itemsWithReplyCount, total };
}

export async function getRepliesByRootId(
  context: DbContext,
  data: { postId: number; rootId: number; offset?: number; limit?: number } & {
    viewerId?: string;
  },
) {
  const [items, total] = await Promise.all([
    CommentRepo.getRepliesByRootId(context.db, data.postId, data.rootId, {
      offset: data.offset,
      limit: data.limit,
      viewerId: data.viewerId,
      status: data.viewerId ? undefined : ["published", "deleted"],
    }),
    CommentRepo.getRepliesByRootIdCount(context.db, data.postId, data.rootId, {
      viewerId: data.viewerId,
      status: data.viewerId ? undefined : ["published", "deleted"],
    }),
  ]);

  return { items, total };
}

// ============ Authed User Service Methods ============

export async function createComment(
  context: AuthContext,
  data: CreateCommentInput,
) {
  // Validation: ensure 2-level structure
  let rootId: number | null = null;
  let replyToCommentId: number | null = null;

  if (data.rootId) {
    // Creating a reply - validate rootId exists and is a root comment
    const rootComment = await CommentRepo.findCommentById(
      context.db,
      data.rootId,
    );
    if (!rootComment) {
      return err({ reason: "ROOT_COMMENT_NOT_FOUND" });
    }
    if (rootComment.rootId !== null) {
      return err({ reason: "INVALID_ROOT_ID" });
    }
    if (rootComment.postId !== data.postId) {
      return err({ reason: "ROOT_COMMENT_POST_MISMATCH" });
    }
    rootId = data.rootId;

    // If replyToCommentId is provided, validate it belongs to the same root
    if (data.replyToCommentId) {
      const replyToComment = await CommentRepo.findCommentById(
        context.db,
        data.replyToCommentId,
      );
      if (!replyToComment) {
        return err({ reason: "REPLY_TO_COMMENT_NOT_FOUND" });
      }
      // replyToComment must be either the root or a reply under the same root
      const actualRootId = replyToComment.rootId ?? replyToComment.id;
      if (actualRootId !== rootId) {
        return err({ reason: "REPLY_TO_COMMENT_ROOT_MISMATCH" });
      }
      replyToCommentId = data.replyToCommentId;
    } else {
      // If no replyToCommentId, default to replying to the root
      replyToCommentId = rootId;
    }
  } else {
    // Creating a root comment - ensure no replyToCommentId
    if (data.replyToCommentId) {
      return err({ reason: "ROOT_COMMENT_CANNOT_HAVE_REPLY_TO" });
    }
  }

  const isAdmin = context.session.user.role === "admin";

  const comment = await CommentRepo.insertComment(context.db, {
    postId: data.postId,
    content: data.content,
    rootId,
    replyToCommentId,
    userId: context.session.user.id,
    // Admin comments are published immediately, others go through moderation
    status: isAdmin ? "published" : "verifying",
  });

  // Trigger AI moderation workflow only for non-admin users
  if (!isAdmin) {
    await startCommentModerationWorkflow(context, { commentId: comment.id });
  }

  // Send reply notification for admin replies (non-admin replies get notified via moderation workflow)
  if (isAdmin && replyToCommentId) {
    const post = await PostService.findPostById(context, {
      id: data.postId,
    });
    if (post) {
      await sendReplyNotification(context.db, context.env, {
        comment: {
          id: comment.id,
          rootId: comment.rootId,
          replyToCommentId: comment.replyToCommentId,
          userId: comment.userId,
          content: data.content,
        },
        post: { slug: post.slug, title: post.title },
      });
    }
  }

  // Notify admin about new root comments from non-admin users only
  // - Skip if admin is commenting (no need to notify yourself)
  // - Skip if it's a reply (only root comments trigger admin notification)
  const isRootComment = rootId === null;
  if (!isAdmin && isRootComment) {
    const post = await PostService.findPostById(context, { id: data.postId });
    if (post) {
      const { ADMIN_EMAIL, DOMAIN } = serverEnv(context.env);
      const commentPreview = convertToPlainText(data.content).slice(0, 100);
      const commenterName = context.session.user.name;

      const emailHtml = renderToStaticMarkup(
        AdminNotificationEmail({
          postTitle: post.title,
          commenterName,
          commentPreview: `${commentPreview}${commentPreview.length >= 100 ? "..." : ""}`,
          commentUrl: `https://${DOMAIN}/post/${post.slug}?highlightCommentId=${comment.id}&rootId=${comment.id}#comment-${comment.id}`,
        }),
      );

      await context.env.QUEUE.send({
        type: "EMAIL",
        data: {
          to: ADMIN_EMAIL,
          subject: `[新评论] ${post.title}`,
          html: emailHtml,
        },
      });
    }
  }

  return ok(comment);
}

export async function deleteComment(
  context: AuthContext,
  data: DeleteCommentInput,
) {
  const comment = await CommentRepo.findCommentById(context.db, data.id);

  if (!comment) {
    throw new Error("COMMENT_NOT_FOUND");
  }

  // Only allow deleting own comments (unless admin)
  const userRole = context.session.user.role;
  if (comment.userId !== context.session.user.id && userRole !== "admin") {
    throw new Error("PERMISSION_DENIED");
  }

  // Soft delete by setting status to deleted
  await CommentRepo.updateComment(context.db, data.id, {
    status: "deleted",
  });

  return { success: true };
}

export async function getMyComments(
  context: AuthContext,
  data: GetMyCommentsInput,
) {
  const comments = await CommentRepo.getCommentsByUserId(
    context.db,
    context.session.user.id,
    {
      offset: data.offset,
      limit: data.limit,
      status: data.status,
    },
  );

  return comments;
}

// ============ Admin Service Methods ============

export async function getAllComments(
  context: DbContext,
  data: GetAllCommentsInput,
) {
  const [items, total] = await Promise.all([
    CommentRepo.getAllComments(context.db, {
      offset: data.offset,
      limit: data.limit,
      status: data.status,
      postId: data.postId,
      userId: data.userId,
      userName: data.userName,
    }),
    CommentRepo.getAllCommentsCount(context.db, {
      status: data.status,
      postId: data.postId,
      userId: data.userId,
      userName: data.userName,
    }),
  ]);

  return { items, total };
}

export async function moderateComment(
  context: DbContext,
  data: ModerateCommentInput,
) {
  const comment = await CommentRepo.findCommentById(context.db, data.id);

  if (!comment) {
    throw new Error("COMMENT_NOT_FOUND");
  }

  const updatedComment = await CommentRepo.updateComment(context.db, data.id, {
    status: data.status,
  });

  // Send reply notification when manually approving a reply comment
  // Guard: only on first approval (comment.status !== "published") to prevent duplicates
  if (
    data.status === "published" &&
    comment.status !== "published" &&
    comment.replyToCommentId
  ) {
    const post = await PostService.findPostById(context, {
      id: comment.postId,
    });
    if (post) {
      await sendReplyNotification(context.db, context.env, {
        comment: {
          id: comment.id,
          rootId: comment.rootId,
          replyToCommentId: comment.replyToCommentId,
          userId: comment.userId,
          content: comment.content,
        },
        post: { slug: post.slug, title: post.title },
      });
    }
  }

  return updatedComment;
}

export async function adminDeleteComment(
  context: DbContext,
  data: DeleteCommentInput,
) {
  const comment = await CommentRepo.findCommentById(context.db, data.id);

  if (!comment) {
    throw new Error("COMMENT_NOT_FOUND");
  }

  // Hard delete for admin
  await CommentRepo.deleteComment(context.db, data.id);

  return { success: true };
}

// ============ Workflow Methods ============

export async function startCommentModerationWorkflow(
  context: DbContext,
  data: StartCommentModerationInput,
) {
  await context.env.COMMENT_MODERATION_WORKFLOW.create({
    params: {
      commentId: data.commentId,
    },
  });
}

export async function findCommentById(context: DbContext, commentId: number) {
  return await CommentRepo.findCommentById(context.db, commentId);
}

export async function updateCommentStatus(
  context: DbContext,
  commentId: number,
  status: "published" | "pending" | "deleted",
  aiReason?: string,
) {
  return await CommentRepo.updateComment(context.db, commentId, {
    status,
    aiReason,
  });
}

export async function getUserCommentStats(context: DbContext, userId: string) {
  return await CommentRepo.getUserCommentStats(context.db, userId);
}
