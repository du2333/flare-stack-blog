import type {
  NotificationEvent,
  NotificationWebhookEventType,
} from "@/features/notification/notification.schema";
import { NOTIFICATION_EVENT } from "@/features/notification/notification.schema";

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

export function createNotificationExampleEvent(
  eventType: NotificationWebhookEventType,
  t: (key: WebhookTranslationKey) => string = (k) => k,
): NotificationEvent {
  switch (eventType) {
    case NOTIFICATION_EVENT.COMMENT_ADMIN_ROOT_CREATED:
      return {
        type: NOTIFICATION_EVENT.COMMENT_ADMIN_ROOT_CREATED,
        data: {
          to: t("admin_email"),
          postTitle: t("post_title"),
          commenterName: t("commenter_name"),
          commentPreview: t("comment_preview"),
          commentUrl: t("comment_url"),
        },
      };
    case NOTIFICATION_EVENT.COMMENT_ADMIN_PENDING_REVIEW:
      return {
        type: NOTIFICATION_EVENT.COMMENT_ADMIN_PENDING_REVIEW,
        data: {
          to: t("admin_email"),
          postTitle: t("post_title"),
          commenterName: t("commenter_name"),
          commentPreview: t("comment_preview"),
          reviewUrl: t("review_url"),
        },
      };
    case NOTIFICATION_EVENT.COMMENT_REPLY_TO_ADMIN_PUBLISHED:
      return {
        type: NOTIFICATION_EVENT.COMMENT_REPLY_TO_ADMIN_PUBLISHED,
        data: {
          to: t("admin_email"),
          postTitle: t("post_title"),
          replierName: t("replier_name"),
          replyPreview: t("reply_preview"),
          commentUrl: t("comment_url"),
          unsubscribeUrl: t("unsubscribe_url"),
        },
      };
    case NOTIFICATION_EVENT.FRIEND_LINK_SUBMITTED:
      return {
        type: NOTIFICATION_EVENT.FRIEND_LINK_SUBMITTED,
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
