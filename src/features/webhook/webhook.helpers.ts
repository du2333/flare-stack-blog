import type { NotificationEvent } from "@/features/notification/notification.schema";
import type { NotificationWebhookEventType } from "@/features/webhook/webhook.schema";
import { m } from "@/paraglide/messages";

export type WebhookTranslationKey =
  | "admin_email"
  | "post_title"
  | "commenter_name"
  | "comment_preview"
  | "review_url"
  | "comment_url"
  | "unsubscribe_url"
  | "replier_name"
  | "reply_preview"
  | "site_name"
  | "site_url"
  | "description"
  | "submitter_name"
  | "friend_link_review_url"
  | "subject"
  | "message";

export const WEBHOOK_EXAMPLE_LABELS: Record<WebhookTranslationKey, string> = {
  admin_email: "admin@example.com",
  post_title: m.webhook_example_post_title(),
  commenter_name: m.webhook_example_commenter_name(),
  comment_preview: m.webhook_example_comment_preview(),
  review_url: "https://example.com/admin/comments",
  comment_url: "https://example.com/posts/welcome#comments",
  unsubscribe_url: "https://example.com/unsubscribe?token=test",
  replier_name: m.webhook_example_replier_name(),
  reply_preview: m.webhook_example_reply_preview(),
  site_name: m.webhook_example_site_name(),
  site_url: "https://example.com",
  description: m.webhook_example_description(),
  submitter_name: m.webhook_example_submitter_name(),
  friend_link_review_url: "https://example.com/admin/friend-links",
  subject: m.webhook_example_subject(),
  message: m.webhook_example_message(),
};

export function createNotificationExampleEvent(
  eventType: NotificationWebhookEventType,
  t: (key: WebhookTranslationKey) => string = (k) => k,
): NotificationEvent {
  switch (eventType) {
    case "comment.admin_root_created":
      return {
        type: "comment.admin_root_created",
        data: {
          to: t("admin_email"),
          postTitle: t("post_title"),
          commenterName: t("commenter_name"),
          commentPreview: t("comment_preview"),
          commentUrl: t("comment_url"),
        },
      };
    case "comment.admin_pending_review":
      return {
        type: "comment.admin_pending_review",
        data: {
          to: t("admin_email"),
          postTitle: t("post_title"),
          commenterName: t("commenter_name"),
          commentPreview: t("comment_preview"),
          reviewUrl: t("review_url"),
        },
      };
    case "comment.reply_to_admin_published":
      return {
        type: "comment.reply_to_admin_published",
        data: {
          to: t("admin_email"),
          postTitle: t("post_title"),
          replierName: t("replier_name"),
          replyPreview: t("reply_preview"),
          commentUrl: t("comment_url"),
          unsubscribeUrl: t("unsubscribe_url"),
        },
      };
    case "friend_link.submitted":
      return {
        type: "friend_link.submitted",
        data: {
          to: t("admin_email"),
          siteName: t("site_name"),
          siteUrl: t("site_url"),
          description: t("description"),
          submitterName: t("submitter_name"),
          reviewUrl: t("friend_link_review_url"),
        },
      };
    default: {
      eventType satisfies never;
      throw new Error("Unknown notification event type");
    }
  }
}
