import type { NotificationEvent } from "@/features/notification/notification.schema";
import type { NotificationWebhookEventType } from "@/features/webhook/webhook.schema";
import type { Locale } from "@/lib/i18n";
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

export function getWebhookExampleLabel(
  key: WebhookTranslationKey,
  options?: { locale?: Locale },
): string {
  switch (key) {
    case "admin_email":
      return "admin@example.com";
    case "post_title":
      return m.webhook_example_post_title({}, options);
    case "commenter_name":
      return m.webhook_example_commenter_name({}, options);
    case "comment_preview":
      return m.webhook_example_comment_preview({}, options);
    case "review_url":
      return "https://example.com/admin/comments";
    case "comment_url":
      return "https://example.com/posts/welcome#comments";
    case "unsubscribe_url":
      return "https://example.com/unsubscribe?token=test";
    case "replier_name":
      return m.webhook_example_replier_name({}, options);
    case "reply_preview":
      return m.webhook_example_reply_preview({}, options);
    case "site_name":
      return m.webhook_example_site_name({}, options);
    case "site_url":
      return "https://example.com";
    case "description":
      return m.webhook_example_description({}, options);
    case "submitter_name":
      return m.webhook_example_submitter_name({}, options);
    case "friend_link_review_url":
      return "https://example.com/admin/friend-links";
    case "subject":
      return m.webhook_example_subject({}, options);
    case "message":
      return m.webhook_example_message({}, options);
    default:
      key satisfies never;
      throw new Error("Unknown webhook translation key");
  }
}

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
