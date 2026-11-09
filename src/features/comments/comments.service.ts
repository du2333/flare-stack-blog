import type {
  CreateCommentInput,
  DeleteCommentInput,
  GetMyCommentsInput,
  GetRepliesByRootIdInput,
  GetRootCommentsInput,
  GetThreadByCommentIdInput,
  MyComment,
  RootCommentWithReplyCount,
} from "@/features/comments/comments.schema";
import {
  commentTargetOf,
  type CommentTarget,
} from "@/features/comments/comment-target";
import {
  publicCommentPath,
  publicCommentUrl,
  type CommentPage,
} from "@/features/comments/comment-url";
import * as CommentRepo from "@/features/comments/data/comments.data";
import * as DashboardRepo from "@/features/dashboard/data/dashboard.data";
import { sendReplyNotification } from "@/features/comments/workflows/helpers";
import { invalidate } from "@/features/cache/public-cache";
import * as MomentRepo from "@/features/moments/data/moments.data";
import { momentHeading } from "@/features/moments/utils/moment-heading";
import { publishNotificationEvent } from "@/features/notification/service/notification.publisher";
import * as MutedUserRepo from "@/features/muted-users/data/muted-users.data";
import { isMuted } from "@/features/muted-users/muted-users";
import * as PostRepo from "@/features/posts/data/posts.data";
import * as PostService from "@/features/posts/services/posts.service";
import { serverEnv } from "@/lib/env/server.env";
import { err, ok } from "@/lib/errors";

/**
 * The Post or Moment a public read is about, while it takes Comments: a Post
 * needs a Public Content Snapshot (ADR 0013), a Moment only has to exist.
 */
async function requireCommentable(context: DbContext, target: CommentTarget) {
  if (target.type === "moment") {
    return (await MomentRepo.findMomentHeadingById(context.db, target.id))
      ? target
      : null;
  }
  const post = await PostService.findPostById(context, { id: target.id });
  if (!post || !post.hasPublicSnapshot) {
    return null;
  }
  return target;
}

/** Whether a Comment belongs to `target`. */
function isOnTarget(
  comment: { postId: number | null; momentId: number | null },
  target: CommentTarget,
) {
  return target.type === "post"
    ? comment.postId === target.id
    : comment.momentId === target.id;
}

/**
 * A Moment's public count of Comments is cached with the Moment (its list,
 * page and sidebar entries), so a Comment created or deleted on it refreshes
 * them. A Post's comment count is not cached.
 */
async function commentsChanged(
  context: DbContext & { executionCtx: ExecutionContext },
  target: CommentTarget,
) {
  if (target.type !== "moment") return;
  await invalidate.momentChanged(context, {
    id: target.id,
    navigationChanged: false,
  });
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

export async function getRootComments(
  context: DbContext & { session?: AuthContext["session"] | null },
  data: GetRootCommentsInput,
) {
  const target = await requireCommentable(context, commentTargetOf(data));
  if (!target) {
    return { items: [], total: 0, viewerMuted: false };
  }

  const [items, total, muted] = await Promise.all([
    CommentRepo.getRootComments(context.db, target, {
      offset: data.offset,
      limit: data.limit,
    }),
    CommentRepo.getPublishedCommentsCount(context.db, target),
    viewerMuted(context),
  ]);

  return {
    items: await withReplyCountsAndPreviews(context.db, target, items),
    total,
    viewerMuted: muted,
  };
}

async function withReplyCountsAndPreviews(
  db: DB,
  target: CommentTarget,
  items: Awaited<ReturnType<typeof CommentRepo.getRootComments>>,
): Promise<Array<RootCommentWithReplyCount>> {
  const rootIds = items.map((item) => item.id);
  const [replyCounts, previews] = await Promise.all([
    CommentRepo.getPublishedReplyCountsByRootIds(db, target, rootIds),
    CommentRepo.getReplyPreviewsByRootIds(db, target, rootIds),
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
  data: GetThreadByCommentIdInput,
) {
  const target = await requireCommentable(context, commentTargetOf(data));
  if (!target) {
    return err({ reason: "COMMENT_NOT_FOUND" });
  }

  const comment = await CommentRepo.findCommentById(context.db, data.id);
  if (!comment || !isOnTarget(comment, target)) {
    return err({ reason: "COMMENT_NOT_FOUND" });
  }

  const rootId = comment.rootId ?? comment.id;
  const root = await CommentRepo.getVisibleRootById(context.db, target, rootId);
  if (!root) {
    return err({ reason: "COMMENT_NOT_FOUND" });
  }

  const [thread] = await withReplyCountsAndPreviews(context.db, target, [root]);
  return ok(thread);
}

export async function getRepliesByRootId(
  context: DbContext,
  data: GetRepliesByRootIdInput,
) {
  const target = await requireCommentable(context, commentTargetOf(data));
  if (!target) {
    return { items: [], total: 0 };
  }

  const root = await CommentRepo.findCommentById(context.db, data.rootId);
  if (!root || !isOnTarget(root, target)) {
    return { items: [], total: 0 };
  }

  const total = await CommentRepo.getReplyCountByRootId(
    context.db,
    target,
    data.rootId,
    { status: "published" },
  );
  if (root.status === "deleted" && total === 0) {
    return { items: [], total: 0 };
  }

  const items = await CommentRepo.getRepliesByRootId(
    context.db,
    target,
    data.rootId,
    {
      offset: data.offset,
      limit: data.limit,
    },
  );

  return { items, total };
}

/**
 * What a new Comment's target is called in notifications, and its page: a
 * Post as readers know it, by the title and at the slug its Public Content
 * Snapshot was published with, not its draft's, which may have changed
 * since; a Moment by the start of its text (`momentHeading`, in the locale
 * notifications are written in). Refuses a Post without a Public Content
 * Snapshot and a Moment that does not exist.
 */
async function commentableTargetPage(
  context: DbContext,
  target: CommentTarget,
) {
  if (target.type === "moment") {
    const moment = await MomentRepo.findMomentHeadingById(
      context.db,
      target.id,
    );
    if (!moment) return err({ reason: "MOMENT_NOT_FOUND" });
    return ok({
      target: "moment" as const,
      title: momentHeading(moment, serverEnv(context.env).LOCALE),
      page: { type: "moment", id: moment.id } satisfies CommentPage,
    });
  }

  const post = await PostRepo.findPostPublicName(context.db, target.id);
  if (!post) {
    return err({ reason: "POST_NOT_FOUND" });
  }
  if (!post.hasPublicSnapshot) {
    return err({ reason: "POST_NOT_PUBLISHED" });
  }
  return ok({
    target: "post" as const,
    title: post.publicTitle ?? post.title,
    page: {
      type: "post",
      slug: post.publicSlug ?? post.slug,
    } satisfies CommentPage,
  });
}

export async function createComment(
  context: AuthContext & { executionCtx: ExecutionContext },
  data: CreateCommentInput,
) {
  const target = commentTargetOf(data);
  const targetPage = await commentableTargetPage(context, target);
  if (targetPage.error) return targetPage;
  const { page, title } = targetPage.data;

  // The sign-in UI asks for a name, but the server is what enforces it.
  if (!context.session.user.name.trim()) {
    return err({ reason: "NAME_REQUIRED" });
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
    if (!isOnTarget(rootComment, target)) {
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
    postId: target.type === "post" ? target.id : null,
    momentId: target.type === "moment" ? target.id : null,
    content: data.content,
    rootId,
    replyToCommentId,
    userId: context.session.user.id,
    status: "published",
  });

  // An Admin's reply handles what it answers, even if later deleted.
  if (isAdmin && replyToCommentId) {
    await CommentRepo.markCommentHandledOnce(
      context.db,
      replyToCommentId,
      new Date(),
    );
  }

  await commentsChanged(context, target);

  if (replyToCommentId) {
    await sendReplyNotification(context, {
      comment: {
        id: comment.id,
        rootId: comment.rootId,
        replyToCommentId: comment.replyToCommentId,
        userId: comment.userId,
        content: data.content,
      },
      target: targetPage.data,
    });
  }

  const isRootComment = rootId === null;
  if (!isAdmin && isRootComment) {
    const { DOMAIN } = serverEnv(context.env);
    const commentPreview = data.content.slice(0, 100);
    const commenterName = context.session.user.name;
    await publishNotificationEvent(context, {
      type: "comment.admin_root_created",
      data: {
        target: targetPage.data.target,
        postTitle: title,
        commenterName,
        commentPreview: `${commentPreview}${commentPreview.length >= 100 ? "..." : ""}`,
        commentUrl: publicCommentUrl(DOMAIN, page, comment.id),
      },
    });
  }

  const { handledAt: _private, ...publicComment } = comment;
  return ok(publicComment);
}

export async function deleteComment(
  context: AuthContext & { executionCtx: ExecutionContext },
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
  if (comment.status !== "deleted") {
    await commentsChanged(context, commentTargetOf(comment));
  }

  return ok({ success: true });
}

/** Takes a Comment off the unreplied list without replying to it. */
export async function markCommentHandled(
  context: DbContext,
  data: { id: number },
) {
  const marked = await CommentRepo.setCommentHandledAt(
    context.db,
    data.id,
    new Date(),
  );
  if (!marked) {
    return err({ reason: "COMMENT_NOT_FOUND" });
  }
  return ok({ success: true });
}

/** Undoes `markCommentHandled`; a Comment an Admin answered stays answered. */
export async function unmarkCommentHandled(
  context: DbContext,
  data: { id: number },
) {
  const unmarked = await CommentRepo.setCommentHandledAt(
    context.db,
    data.id,
    null,
  );
  if (!unmarked) {
    return err({ reason: "COMMENT_NOT_FOUND" });
  }
  return ok({ success: true });
}

/** Marks every Comment still waiting for a reply handled. */
export async function markAllUnrepliedCommentsHandled(context: DbContext) {
  const count = await DashboardRepo.markUnrepliedCommentsHandled(
    context.db,
    new Date(),
  );
  return { count };
}

/**
 * The current User's Comments, each saying which page it is on: a Moment's
 * by its heading (in the request's locale) and every one by its public link,
 * except on a Post that is not public.
 */
export async function getMyComments(
  context: AuthContext,
  data: GetMyCommentsInput,
): Promise<Array<MyComment>> {
  const rows = await CommentRepo.getCommentsByUserId(
    context.db,
    context.session.user.id,
    {
      offset: data.offset,
      limit: data.limit,
      status: data.status,
    },
  );
  return rows.map(({ comment, postSlug, momentText, momentHasVideo }) => {
    const { handledAt: _private, ...publicComment } = comment;
    if (comment.momentId !== null && momentText !== null) {
      return {
        ...publicComment,
        momentTitle: momentHeading({
          text: momentText,
          hasVideo: momentHasVideo,
        }),
        commentPath: publicCommentPath(
          { type: "moment", id: comment.momentId },
          comment.id,
        ),
      };
    }
    return {
      ...publicComment,
      momentTitle: null,
      commentPath: postSlug
        ? publicCommentPath({ type: "post", slug: postSlug }, comment.id)
        : null,
    };
  });
}
