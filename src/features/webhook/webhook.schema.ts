import { z } from "zod";
import type { NotificationEvent } from "@/features/notification/notification.schema";
import { ADMIN_NOTIFICATION_EVENTS } from "@/features/notification/notification.schema";

export const NOTIFICATION_WEBHOOK_EVENTS = ADMIN_NOTIFICATION_EVENTS;

export const notificationWebhookEventTypeSchema = z.enum(
  NOTIFICATION_WEBHOOK_EVENTS,
);

export type NotificationWebhookEventType =
  (typeof NOTIFICATION_WEBHOOK_EVENTS)[number];

export function isNotificationWebhookEventType(
  event: NotificationEvent,
): event is Extract<
  NotificationEvent,
  { type: (typeof NOTIFICATION_WEBHOOK_EVENTS)[number] }
> {
  return NOTIFICATION_WEBHOOK_EVENTS.some((type) => type === event.type);
}

export const webhookEndpointSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  url: z.url(),
  enabled: z.boolean(),
  secret: z.string().min(1),
  events: z.array(notificationWebhookEventTypeSchema),
});
