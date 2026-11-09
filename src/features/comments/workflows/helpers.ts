import {
  publicCommentUrl,
  type CommentPage,
} from "@/features/comments/comment-url";
import * as CommentRepo from "@/features/comments/data/comments.data";
import { generateUnsubscribeToken } from "@/features/email/email.utils";
import type { CommentNotificationTarget } from "@/features/notification/notification.schema";
import { publishNotificationEvent } from "@/features/notification/service/notification.publisher";
import { serverEnv } from "@/lib/env/server.env";

interface SendReplyNotificationParams {
  comment: {
    id: number;
    rootId: number | null;
    replyToCommentId: number | null;
    userId: string | null;
    content: string | null;
  };
  /** The Post or Moment replied on, as notifications name and link it. */
  target: {
    target: CommentNotificationTarget;
    title: string;
    page: CommentPage;
  };
  skipNotifyUserId?: string;
}

export async function sendReplyNotification(
  context: DbContext & { executionCtx: ExecutionContext },
  params: SendReplyNotificationParams,
): Promise<void> {
  const { comment, target } = params;

  if (!comment.replyToCommentId) return;

  // Get the author of the comment being replied to
  const replyToAuthor = await CommentRepo.getCommentAuthorWithEmail(
    context.db,
    comment.replyToCommentId,
  );

  if (!replyToAuthor || !replyToAuthor.email) {
    console.log(
      JSON.stringify({
        message: "reply notification skipped, author not found or no email",
        replyToCommentId: comment.replyToCommentId,
      }),
    );
    return;
  }

  // Don't notify if replying to own comment
  if (comment.userId && replyToAuthor.id === comment.userId) {
    console.log(
      JSON.stringify({ message: "reply notification skipped, self-reply" }),
    );
    return;
  }

  // Don't notify if the moderator is the reply-to author (they already read the comment)
  if (params.skipNotifyUserId && replyToAuthor.id === params.skipNotifyUserId) {
    console.log(
      JSON.stringify({
        message: "reply notification skipped, moderator is reply-to author",
      }),
    );
    return;
  }

  // Get replier info
  const replier = await CommentRepo.getCommentAuthorWithEmail(
    context.db,
    comment.id,
  );
  const replierName = replier?.name ?? "有人";
  const replyPreview = (comment.content ?? "").slice(0, 100);

  const { DOMAIN, BETTER_AUTH_SECRET } = serverEnv(context.env);
  const unsubscribeType = "reply_notification" as const;
  const token = await generateUnsubscribeToken(
    BETTER_AUTH_SECRET,
    replyToAuthor.id,
    unsubscribeType,
  );
  const unsubscribeUrl = `https://${DOMAIN}/unsubscribe?userId=${replyToAuthor.id}&type=${unsubscribeType}&token=${token}`;

  const commentUrl = publicCommentUrl(DOMAIN, target.page, comment.id);

  try {
    await publishNotificationEvent(
      { db: context.db, env: context.env, executionCtx: context.executionCtx },
      {
        type:
          replyToAuthor.role === "admin"
            ? "comment.reply_to_admin_published"
            : "comment.reply_to_user_published",
        data: {
          target: target.target,
          postTitle: target.title,
          replierName,
          replyPreview: `${replyPreview}${replyPreview.length >= 100 ? "..." : ""}`,
          commentUrl,
        },
      },
      { to: replyToAuthor.email, unsubscribeUrl },
    );

    console.log(
      JSON.stringify({
        message: "reply notification queued",
        to: replyToAuthor.email,
        commentId: comment.id,
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "reply notification queue failed",
        commentId: comment.id,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
