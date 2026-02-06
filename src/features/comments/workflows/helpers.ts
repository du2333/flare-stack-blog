import { renderToStaticMarkup } from "react-dom/server";
import type { JSONContent } from "@tiptap/core";
import type { EmailUnsubscribeType } from "@/lib/db/schema";
import * as CommentRepo from "@/features/comments/data/comments.data";
import * as EmailData from "@/features/email/data/email.data";
import { generateUnsubscribeToken } from "@/features/email/email.utils";
import { ReplyNotificationEmail } from "@/features/email/templates/ReplyNotificationEmail";
import { convertToPlainText } from "@/features/posts/utils/content";
import { serverEnv } from "@/lib/env/server.env";

interface SendReplyNotificationParams {
  comment: {
    id: number;
    rootId: number | null;
    replyToCommentId: number | null;
    userId: string;
    content: JSONContent | null;
  };
  post: {
    slug: string;
    title: string;
  };
}

export async function sendReplyNotification(
  db: DB,
  env: Env,
  params: SendReplyNotificationParams,
): Promise<void> {
  const { comment, post } = params;

  if (!comment.replyToCommentId) return;

  // Get the author of the comment being replied to
  const replyToAuthor = await CommentRepo.getCommentAuthorWithEmail(
    db,
    comment.replyToCommentId,
  );

  if (!replyToAuthor || !replyToAuthor.email) {
    console.log(
      `[sendReplyNotification] Reply-to author not found or no email, skipping notification`,
    );
    return;
  }

  // Don't notify if replying to own comment
  if (replyToAuthor.id === comment.userId) {
    console.log(`[sendReplyNotification] Self-reply, skipping notification`);
    return;
  }

  // Check for unsubscription
  const unsubscribed = await EmailData.isUnsubscribed(
    db,
    replyToAuthor.id,
    "reply_notification",
  );

  if (unsubscribed) {
    console.log(
      `[sendReplyNotification] User ${replyToAuthor.id} unsubscribed from reply notifications, skipping`,
    );
    return;
  }

  // Get replier info
  const replier = await CommentRepo.getCommentAuthorWithEmail(db, comment.id);
  const replierName = replier?.name ?? "有人";
  const replyPreview = convertToPlainText(comment.content).slice(0, 100);

  const { DOMAIN, BETTER_AUTH_SECRET } = serverEnv(env);
  const unsubscribeType: EmailUnsubscribeType = "reply_notification";
  const token = await generateUnsubscribeToken(
    BETTER_AUTH_SECRET,
    replyToAuthor.id,
    unsubscribeType,
  );
  const unsubscribeUrl = `https://${DOMAIN}/unsubscribe?userId=${replyToAuthor.id}&type=${unsubscribeType}&token=${token}`;

  // Build URL with comment anchor and query params for direct navigation
  const rootId = comment.rootId ?? comment.id;
  const commentUrl = `https://${DOMAIN}/post/${post.slug}?highlightCommentId=${comment.id}&rootId=${rootId}#comment-${comment.id}`;

  const emailHtml = renderToStaticMarkup(
    ReplyNotificationEmail({
      postTitle: post.title,
      replierName,
      replyPreview: `${replyPreview}${replyPreview.length >= 100 ? "..." : ""}`,
      commentUrl,
      unsubscribeUrl,
    }),
  );

  try {
    await env.QUEUE.send({
      type: "EMAIL",
      data: {
        to: replyToAuthor.email,
        subject: `[评论回复] ${replierName} 回复了您在《${post.title}》的评论`,
        html: emailHtml,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      },
    });

    console.log(
      `[sendReplyNotification] Reply notification queued for ${replyToAuthor.email}`,
    );
  } catch (error) {
    console.error(
      `[sendReplyNotification] Failed to queue reply notification for comment ${comment.id}:`,
      error,
    );
  }
}
