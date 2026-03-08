import type {
  NotificationEvent,
  NotificationWebhookEventType,
} from "@/features/notification/notification.schema";
import * as ConfigService from "@/features/config/service/config.service";
import {
  NOTIFICATION_EVENT,
  isNotificationWebhookEventType,
  notificationEventSchema,
} from "@/features/notification/notification.schema";
import { createEmailMessageFromNotification } from "@/features/email/service/email-message.mapper";

const adminNotificationEventTypes = [
  NOTIFICATION_EVENT.COMMENT_ADMIN_ROOT_CREATED,
  NOTIFICATION_EVENT.COMMENT_ADMIN_PENDING_REVIEW,
  NOTIFICATION_EVENT.COMMENT_REPLY_TO_ADMIN_PUBLISHED,
  NOTIFICATION_EVENT.FRIEND_LINK_SUBMITTED,
] as const;

const userNotificationEventTypes = [
  NOTIFICATION_EVENT.COMMENT_REPLY_TO_USER_PUBLISHED,
  NOTIFICATION_EVENT.FRIEND_LINK_APPROVED,
  NOTIFICATION_EVENT.FRIEND_LINK_REJECTED,
] as const;

function isAdminNotificationEvent(
  event: NotificationEvent,
): event is Extract<
  NotificationEvent,
  { type: (typeof adminNotificationEventTypes)[number] }
> {
  return adminNotificationEventTypes.some((type) => type === event.type);
}

function isUserNotificationEvent(
  event: NotificationEvent,
): event is Extract<
  NotificationEvent,
  { type: (typeof userNotificationEventTypes)[number] }
> {
  return userNotificationEventTypes.some((type) => type === event.type);
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
) {
  const config = await ConfigService.getSystemConfig(context);
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
    return;
  }

  if (isAdminNotificationEvent(parsed)) {
    const deliveries: Array<Promise<void>> = [];

    if (adminEmailEnabled) {
      deliveries.push(enqueueEmailNotification(context, parsed));
    }

    if (adminWebhookEnabled && isNotificationWebhookEventType(parsed.type)) {
      deliveries.push(enqueueWebhookNotification(context, parsed));
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
