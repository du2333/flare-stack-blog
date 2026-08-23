import type {
  CreateCommentInput,
  DeleteCommentInput,
  GetCommentsByPostIdInput,
  GetMyCommentsInput,
} from "@/features/comments/comments.schema";
import * as CommentRepo from "@/features/comments/data/comments.data";
import { sendReplyNotification } from "@/features/comments/workflows/helpers";
import { publishNotificationEvent } from "@/features/notification/service/notification.publisher";
import * as PostService from "@/features/posts/services/posts.service";
import { convertToPlainText } from "@/features/posts/utils/content";
import { serverEnv } from "@/lib/env/server.env";
import { err, ok } from "@/lib/errors";

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
  context: AuthContext & { executionCtx: ExecutionContext },
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
    status: "published",
  });

  if (replyToCommentId) {
    const post = await PostService.findPostById(context, {
      id: data.postId,
    });
    if (post) {
      await sendReplyNotification(context, {
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
      await publishNotificationEvent(context, {
        type: "comment.admin_root_created",
        data: {
          to: ADMIN_EMAIL,
          postTitle: post.title,
          commenterName,
          commentPreview: `${commentPreview}${commentPreview.length >= 100 ? "..." : ""}`,
          commentUrl: `https://${DOMAIN}/post/${post.slug}?highlightCommentId=${comment.id}&rootId=${comment.id}#comment-${comment.id}`,
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
    return err({ reason: "COMMENT_NOT_FOUND" });
  }

  // Only allow deleting own comments (unless admin)
  const userRole = context.session.user.role;
  if (comment.userId !== context.session.user.id && userRole !== "admin") {
    return err({ reason: "PERMISSION_DENIED" });
  }

  // Soft delete by setting status to deleted
  await CommentRepo.updateComment(context.db, data.id, {
    status: "deleted",
  });

  return ok({ success: true });
}

export async function getMyComments(
  context: AuthContext,
  data: GetMyCommentsInput,
) {
  return await CommentRepo.getCommentsByUserId(
    context.db,
    context.session.user.id,
    {
      offset: data.offset,
      limit: data.limit,
      status: data.status,
    },
  );
}
