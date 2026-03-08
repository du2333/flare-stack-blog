import type { NotificationEvent } from "@/features/notification/notification.schema";
import type { NotificationWebhookEventType } from "@/features/webhook/webhook.schema";
import * as ConfigService from "@/features/config/service/config.service";
import {
  ADMIN_NOTIFICATION_EVENTS,
  USER_NOTIFICATION_EVENTS,
  notificationEventSchema,
} from "@/features/notification/notification.schema";
import { isNotificationWebhookEventType } from "@/features/webhook/webhook.schema";
import { createEmailMessageFromNotification } from "@/features/email/service/email-message.mapper";

function isAdminNotificationEvent(
  event: NotificationEvent,
): event is Extract<
  NotificationEvent,
  { type: (typeof ADMIN_NOTIFICATION_EVENTS)[number] }
> {
  return ADMIN_NOTIFICATION_EVENTS.some((type) => type === event.type);
}

function isUserNotificationEvent(
  event: NotificationEvent,
): event is Extract<
  NotificationEvent,
  { type: (typeof USER_NOTIFICATION_EVENTS)[number] }
> {
  return USER_NOTIFICATION_EVENTS.some((type) => type === event.type);
}

function getMatchedWebhookEndpoints(
  config: Awaited<ReturnType<typeof ConfigService.getSystemConfig>>,
  eventType: NotificationWebhookEventType,
) {
  return (
    config?.notification?.webhooks?.filter(
      (endpoint) => endpoint.enabled && endpoint.events.includes(eventType),
    ) ?? []
  );
}

async function enqueueEmailNotification(
  context: DbContext,
  event: NotificationEvent,
) {
  const emailMessage = createEmailMessageFromNotification(event);
  await context.env.QUEUE.send({
    type: "EMAIL",
    data: emailMessage,
  });
}

async function enqueueWebhookNotification(
  context: DbContext & { executionCtx: ExecutionContext },
  event: Extract<NotificationEvent, { type: NotificationWebhookEventType }>,
  config: Awaited<ReturnType<typeof ConfigService.getSystemConfig>>,
) {
  const endpoints = getMatchedWebhookEndpoints(config, event.type);

  await Promise.all(
    endpoints.map((endpoint) =>
      context.env.QUEUE.send({
        type: "WEBHOOK",
        data: {
          endpointId: endpoint.id,
          url: endpoint.url,
          secret: endpoint.secret,
          event,
        },
      }),
    ),
  );
}

export async function publishNotificationEvent(
  context: DbContext & { executionCtx: ExecutionContext },
  event: NotificationEvent,
) {
  const parsed = notificationEventSchema.parse(event);
  const config = await ConfigService.getSystemConfig(context);
  const adminEmailEnabled =
    config?.notification?.admin?.channels?.email ?? true;
  const adminWebhookEnabled =
    config?.notification?.admin?.channels?.webhook ?? true;
  const userEmailEnabled = config?.notification?.user?.emailEnabled ?? true;

  if (isUserNotificationEvent(parsed)) {
    if (!userEmailEnabled) {
      return;
    }

    await enqueueEmailNotification(context, parsed);
    console.log(
      JSON.stringify({
        level: "info",
        message: "Notification published",
        eventType: parsed.type,
        deliveries: { email: true },
      }),
    );
    return;
  }

  if (isAdminNotificationEvent(parsed)) {
    const deliveries: Array<Promise<void>> = [];

    if (adminEmailEnabled) {
      deliveries.push(enqueueEmailNotification(context, parsed));
    }

    if (adminWebhookEnabled && isNotificationWebhookEventType(parsed)) {
      deliveries.push(enqueueWebhookNotification(context, parsed, config));
    }

    console.log(
      JSON.stringify({
        level: "info",
        message: "Notification published",
        eventType: parsed.type,
        deliveries: {
          email: adminEmailEnabled,
          webhook: adminWebhookEnabled,
        },
      }),
    );
    await Promise.all(deliveries);
    return;
  }

  parsed satisfies never;
}
