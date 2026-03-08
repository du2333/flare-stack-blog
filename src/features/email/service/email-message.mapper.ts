import { renderToStaticMarkup } from "react-dom/server";
import type { NotificationEvent } from "@/features/notification/notification.schema";
import type { EmailMessage } from "@/lib/queue/queue.schema";
import { AdminNotificationEmail } from "@/features/email/templates/AdminNotificationEmail";
import { FriendLinkAdminNotificationEmail } from "@/features/email/templates/FriendLinkAdminNotificationEmail";
import { FriendLinkResultNotificationEmail } from "@/features/email/templates/FriendLinkResultNotificationEmail";
import { ReplyNotificationEmail } from "@/features/email/templates/ReplyNotificationEmail";

function getReplyNotificationUnsubscribe(url: string) {
  const unsubscribeUrl = new URL(url);
  const userId = unsubscribeUrl.searchParams.get("userId");
  const type = unsubscribeUrl.searchParams.get("type");

  if (!userId || type !== "reply_notification") {
    return undefined;
  }

  return {
    userId,
    type,
  } as const;
}

export function createEmailMessageFromNotification(
  event: NotificationEvent,
): EmailMessage["data"] {
  switch (event.type) {
    case "comment.admin_root_created":
      return {
        to: event.data.to,
        subject: `[新评论] ${event.data.postTitle}`,
        html: renderToStaticMarkup(
          AdminNotificationEmail({
            postTitle: event.data.postTitle,
            commenterName: event.data.commenterName,
            commentPreview: event.data.commentPreview,
            commentUrl: event.data.commentUrl,
          }),
        ),
      };
    case "comment.admin_pending_review":
      return {
        to: event.data.to,
        subject: `[待审核] ${event.data.postTitle}`,
        html: renderToStaticMarkup(
          AdminNotificationEmail({
            postTitle: event.data.postTitle,
            commenterName: event.data.commenterName,
            commentPreview: event.data.commentPreview,
            commentUrl: event.data.reviewUrl,
          }),
        ),
      };
    case "comment.reply_to_admin_published":
    case "comment.reply_to_user_published":
      return {
        to: event.data.to,
        subject: `[评论回复] ${event.data.replierName} 回复了您在《${event.data.postTitle}》的评论`,
        html: renderToStaticMarkup(
          ReplyNotificationEmail({
            postTitle: event.data.postTitle,
            replierName: event.data.replierName,
            replyPreview: event.data.replyPreview,
            commentUrl: event.data.commentUrl,
            unsubscribeUrl: event.data.unsubscribeUrl,
          }),
        ),
        headers: {
          "List-Unsubscribe": `<${event.data.unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        unsubscribe: getReplyNotificationUnsubscribe(event.data.unsubscribeUrl),
      };
    case "friend_link.submitted":
      return {
        to: event.data.to,
        subject: `[友链申请] ${event.data.siteName}`,
        html: renderToStaticMarkup(
          FriendLinkAdminNotificationEmail({
            siteName: event.data.siteName,
            siteUrl: event.data.siteUrl,
            description: event.data.description,
            submitterName: event.data.submitterName,
            reviewUrl: event.data.reviewUrl,
          }),
        ),
      };
    case "friend_link.approved":
      return {
        to: event.data.to,
        subject: `[友链审核通过] ${event.data.siteName}`,
        html: renderToStaticMarkup(
          FriendLinkResultNotificationEmail({
            siteName: event.data.siteName,
            approved: true,
            blogUrl: event.data.blogUrl,
          }),
        ),
      };
    case "friend_link.rejected":
      return {
        to: event.data.to,
        subject: `[友链审核结果] ${event.data.siteName}`,
        html: renderToStaticMarkup(
          FriendLinkResultNotificationEmail({
            siteName: event.data.siteName,
            approved: false,
            rejectionReason: event.data.rejectionReason,
          }),
        ),
      };
    default: {
      event satisfies never;
      throw new Error("Unknown notification event");
    }
  }
}
