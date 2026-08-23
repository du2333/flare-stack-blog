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
import { serverEnv } from "@/lib/env/server.env";
import { err, ok } from "@/lib/errors";

async function requirePublishedPost(context: DbContext, postId: number) {
  const post = await PostService.findPostById(context, { id: postId });
  if (!post || !post.hasPublicSnapshot) {
    return null;
  }
  return post;
}

export async function getRootCommentsByPostId(
  context: DbContext,
  data: GetCommentsByPostIdInput,
) {
  const post = await requirePublishedPost(context, data.postId);
  if (!post) {
    return { items: [], total: 0 };
  }

  const [items, total] = await Promise.all([
    CommentRepo.getRootCommentsByPostId(context.db, data.postId, {
      offset: data.offset,
      limit: data.limit,
    }),
    CommentRepo.getPublishedRootCommentsCount(context.db, data.postId),
  ]);

  const rootIds = items.map((item) => item.id);
  const [replyCounts, previews] = await Promise.all([
    CommentRepo.getPublishedReplyCountsByRootIds(
      context.db,
      data.postId,
      rootIds,
    ),
    CommentRepo.getReplyPreviewsByRootIds(context.db, data.postId, rootIds),
  ]);

  return {
    items: items.map((item) => {
      const replyCount = replyCounts.get(item.id) ?? 0;
      return {
        ...item,
        replyCount,
        replies: replyCount === 0 ? [] : (previews.get(item.id) ?? []),
      };
    }),
    total,
  };
}

export async function getRepliesByRootId(
  context: DbContext,
  data: { postId: number; rootId: number; offset?: number; limit?: number },
) {
  const post = await requirePublishedPost(context, data.postId);
  if (!post) {
    return { items: [], total: 0 };
  }

  const root = await CommentRepo.findCommentById(context.db, data.rootId);
  if (!root || root.postId !== data.postId) {
    return { items: [], total: 0 };
  }

  const total = await CommentRepo.getReplyCountByRootId(
    context.db,
    data.postId,
    data.rootId,
    { status: "published" },
  );
  if (root.status === "deleted" && total === 0) {
    return { items: [], total: 0 };
  }

  const items = await CommentRepo.getRepliesByRootId(
    context.db,
    data.postId,
    data.rootId,
    {
      offset: data.offset,
      limit: data.limit,
    },
  );

  return { items, total };
}

export async function createComment(
  context: AuthContext & { executionCtx: ExecutionContext },
  data: CreateCommentInput,
) {
  const post = await PostService.findPostById(context, { id: data.postId });
  if (!post) {
    return err({ reason: "POST_NOT_FOUND" });
  }
  if (!post.hasPublicSnapshot) {
    return err({ reason: "POST_NOT_PUBLISHED" });
  }

  let rootId: number | null = null;
  let replyToCommentId: number | null = null;

  if (data.rootId) {
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

    if (data.replyToCommentId) {
      const replyToComment = await CommentRepo.findCommentById(
        context.db,
        data.replyToCommentId,
      );
      if (!replyToComment) {
        return err({ reason: "REPLY_TO_COMMENT_NOT_FOUND" });
      }
      const actualRootId = replyToComment.rootId ?? replyToComment.id;
      if (actualRootId !== rootId) {
        return err({ reason: "REPLY_TO_COMMENT_ROOT_MISMATCH" });
      }
      replyToCommentId = data.replyToCommentId;
    } else {
      replyToCommentId = rootId;
    }
  } else if (data.replyToCommentId) {
    return err({ reason: "ROOT_COMMENT_CANNOT_HAVE_REPLY_TO" });
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

  const isRootComment = rootId === null;
  if (!isAdmin && isRootComment) {
    const { ADMIN_EMAIL, DOMAIN } = serverEnv(context.env);
    const commentPreview = data.content.slice(0, 100);
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

  const userRole = context.session.user.role;
  if (comment.userId !== context.session.user.id && userRole !== "admin") {
    return err({ reason: "PERMISSION_DENIED" });
  }

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
