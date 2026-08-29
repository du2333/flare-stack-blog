import { z } from "zod";
import * as ConfigService from "@/features/config/service/config.service";
import { createEmailMessageFromNotification } from "@/features/email/service/email-message.mapper";
import type {
  NotificationDelivery,
  NotificationEvent,
} from "@/features/notification/notification.schema";
import {
  ADMIN_NOTIFICATION_EVENTS,
  notificationEventSchema,
  USER_NOTIFICATION_EVENTS,
} from "@/features/notification/notification.schema";
import { serverEnv } from "@/lib/env/server.env";

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

function configuredWebhookEndpoint(
  config: Awaited<ReturnType<typeof ConfigService.getSystemConfig>>,
) {
  const url = config?.notification?.webhook?.url?.trim() ?? "";
  const secret = config?.notification?.webhook?.secret?.trim() ?? "";
  if (!url || !secret || !z.url().safeParse(url).success) return null;
  return { url, secret };
}

async function enqueueEmailNotification(
  context: DbContext,
  event: NotificationEvent,
  delivery: NotificationDelivery,
) {
  const emailMessage = createEmailMessageFromNotification(
    event,
    serverEnv(context.env).LOCALE,
    delivery,
  );
  await context.env.QUEUE.send({
    type: "EMAIL",
    data: emailMessage,
  });
}

async function enqueueWebhookNotification(
  context: DbContext,
  event: Extract<
    NotificationEvent,
    { type: (typeof ADMIN_NOTIFICATION_EVENTS)[number] }
  >,
  endpoint: { url: string; secret: string },
) {
  await context.env.QUEUE.send({
    type: "WEBHOOK",
    data: {
      url: endpoint.url,
      secret: endpoint.secret,
      event,
    },
  });
}

export async function publishNotificationEvent(
  context: DbContext & { executionCtx: ExecutionContext },
  event: NotificationEvent,
  delivery: NotificationDelivery,
) {
  const parsed = notificationEventSchema.parse(event);
  const config = await ConfigService.getSystemConfig(context);
  const adminEmailEnabled =
    config?.notification?.admin?.channels?.email ?? true;
  const userEmailEnabled = config?.notification?.user?.emailEnabled ?? true;
  const webhookEndpoint = configuredWebhookEndpoint(config);

  if (isUserNotificationEvent(parsed)) {
    if (!userEmailEnabled) {
      return;
    }

    await enqueueEmailNotification(context, parsed, delivery);
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
      deliveries.push(enqueueEmailNotification(context, parsed, delivery));
    }

    if (webhookEndpoint) {
      deliveries.push(
        enqueueWebhookNotification(context, parsed, webhookEndpoint),
      );
    }

    console.log(
      JSON.stringify({
        level: "info",
        message: "Notification published",
        eventType: parsed.type,
        deliveries: {
          email: adminEmailEnabled,
          webhook: Boolean(webhookEndpoint),
        },
      }),
    );
    await Promise.all(deliveries);
    return;
  }

  parsed satisfies never;
}
