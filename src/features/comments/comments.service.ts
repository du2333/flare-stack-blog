import type {
  CreateCommentInput,
  DeleteCommentInput,
  GetCommentsByPostIdInput,
  GetMyCommentsInput,
  RootCommentWithReplyCount,
} from "@/features/comments/comments.schema";
import { publicCommentUrl } from "@/features/comments/comment-url";
import * as CommentRepo from "@/features/comments/data/comments.data";
import { sendReplyNotification } from "@/features/comments/workflows/helpers";
import { publishNotificationEvent } from "@/features/notification/service/notification.publisher";
import * as MutedUserRepo from "@/features/muted-users/data/muted-users.data";
import { isMuted } from "@/features/muted-users/muted-users";
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

async function viewerMuted(
  context: DbContext & { session?: AuthContext["session"] | null },
) {
  const sessionUser = context.session?.user;
  if (!sessionUser || sessionUser.role === "admin") {
    return false;
  }
  const actor = await MutedUserRepo.findUserById(context.db, sessionUser.id);
  return isMuted(actor?.mutedAt);
}

export async function getRootCommentsByPostId(
  context: DbContext & { session?: AuthContext["session"] | null },
  data: GetCommentsByPostIdInput,
) {
  const post = await requirePublishedPost(context, data.postId);
  if (!post) {
    return { items: [], total: 0, viewerMuted: false };
  }

  const [items, total, muted] = await Promise.all([
    CommentRepo.getRootCommentsByPostId(context.db, data.postId, {
      offset: data.offset,
      limit: data.limit,
    }),
    CommentRepo.getPublishedRootCommentsCount(context.db, data.postId),
    viewerMuted(context),
  ]);

  return {
    items: await withReplyCountsAndPreviews(context.db, data.postId, items),
    total,
    viewerMuted: muted,
  };
}

async function withReplyCountsAndPreviews(
  db: DB,
  postId: number,
  items: Awaited<ReturnType<typeof CommentRepo.getRootCommentsByPostId>>,
): Promise<Array<RootCommentWithReplyCount>> {
  const rootIds = items.map((item) => item.id);
  const [replyCounts, previews] = await Promise.all([
    CommentRepo.getPublishedReplyCountsByRootIds(db, postId, rootIds),
    CommentRepo.getReplyPreviewsByRootIds(db, postId, rootIds),
  ]);

  return items.map((item) => {
    const replyCount = replyCounts.get(item.id) ?? 0;
    return {
      ...item,
      replyCount,
      replies: replyCount === 0 ? [] : (previews.get(item.id) ?? []),
    };
  });
}

export async function getThreadByCommentId(
  context: DbContext,
  data: { postId: number; id: number },
) {
  const post = await requirePublishedPost(context, data.postId);
  if (!post) {
    return err({ reason: "COMMENT_NOT_FOUND" });
  }

  const comment = await CommentRepo.findCommentById(context.db, data.id);
  if (!comment || comment.postId !== data.postId) {
    return err({ reason: "COMMENT_NOT_FOUND" });
  }

  const rootId = comment.rootId ?? comment.id;
  const root = await CommentRepo.getVisibleRootById(
    context.db,
    data.postId,
    rootId,
  );
  if (!root) {
    return err({ reason: "COMMENT_NOT_FOUND" });
  }

  const [thread] = await withReplyCountsAndPreviews(context.db, data.postId, [
    root,
  ]);
  return ok(thread);
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

  if (context.session.user.role !== "admin") {
    const actor = await MutedUserRepo.findUserById(
      context.db,
      context.session.user.id,
    );
    if (isMuted(actor?.mutedAt)) {
      return err({ reason: "USER_MUTED" });
    }
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
        commentUrl: publicCommentUrl(DOMAIN, post.slug, comment.id),
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
