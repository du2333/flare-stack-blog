import type {
  NotificationEventType,
  NotificationWebhookEventType,
} from "@/features/notification/notification.schema";
import {
  NOTIFICATION_EVENT,
  NOTIFICATION_WEBHOOK_EVENTS,
} from "@/features/notification/notification.schema";

export const WEBHOOK_EVENT_LABELS: Record<
  NotificationWebhookEventType,
  string
> = {
  [NOTIFICATION_EVENT.COMMENT_ADMIN_ROOT_CREATED]: "读者发表新评论",
  [NOTIFICATION_EVENT.COMMENT_ADMIN_PENDING_REVIEW]: "评论进入待审核",
  [NOTIFICATION_EVENT.COMMENT_REPLY_TO_ADMIN_PUBLISHED]: "读者回复博主评论",
  [NOTIFICATION_EVENT.FRIEND_LINK_SUBMITTED]: "收到新的友链申请",
};

export function createWebhookEndpoint() {
  return {
    id: crypto.randomUUID(),
    name: "",
    url: "",
    enabled: true,
    secret: crypto.randomUUID(),
    events: [
      ...NOTIFICATION_WEBHOOK_EVENTS,
    ] satisfies Array<NotificationEventType>,
  };
}
