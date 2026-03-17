import type { NotificationEventType } from "@/features/notification/notification.schema";
import type { NotificationWebhookEventType } from "@/features/webhook/webhook.schema";
import { NOTIFICATION_WEBHOOK_EVENTS } from "@/features/webhook/webhook.schema";
import { m } from "@/paraglide/messages";

export const WEBHOOK_EVENT_LABELS: Record<
  NotificationWebhookEventType,
  string
> = {
  "comment.admin_root_created": m.settings_webhook_event_comment_created(),
  "comment.admin_pending_review": m.settings_webhook_event_comment_pending(),
  "comment.reply_to_admin_published": m.settings_webhook_event_comment_reply(),
  "friend_link.submitted": m.settings_webhook_event_friend_link(),
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
