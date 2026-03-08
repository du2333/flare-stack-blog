import type { NotificationEventType } from "@/features/notification/notification.schema";
import type { NotificationWebhookEventType } from "@/features/webhook/webhook.schema";
import { NOTIFICATION_WEBHOOK_EVENTS } from "@/features/webhook/webhook.schema";

export const WEBHOOK_EVENT_LABELS: Record<
  NotificationWebhookEventType,
  string
> = {
  "comment.admin_root_created": "读者发表新评论",
  "comment.admin_pending_review": "评论进入待审核",
  "comment.reply_to_admin_published": "读者回复博主评论",
  "friend_link.submitted": "收到新的友链申请",
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
