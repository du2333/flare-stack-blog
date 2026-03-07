import type {
  NotificationChannel,
  NotificationEvent,
  NotificationEventType,
} from "@/features/notification/notification.schema";
import * as ConfigRepo from "@/features/config/data/config.data";
import { notificationEventSchema } from "@/features/notification/notification.schema";
import { createEmailMessageFromNotification } from "@/features/email/service/email-message.mapper";

const notificationChannelPolicy = {
  "comment.admin_root_created": ["email", "webhook"],
  "comment.admin_pending_review": ["email", "webhook"],
  "comment.reply_to_admin_published": ["email", "webhook"],
  "comment.reply_to_user_published": ["email"],
  "friend_link.submitted": ["email", "webhook"],
  "friend_link.approved": ["email"],
  "friend_link.rejected": ["email"],
} as const satisfies Record<
  NotificationEventType,
  ReadonlyArray<NotificationChannel>
>;

function getMatchedWebhookEndpoints(
  config: Awaited<ReturnType<typeof ConfigRepo.getSystemConfig>>,
  eventType: NotificationEventType,
) {
  return (
    config?.notification?.webhooks?.filter(
      (endpoint) => endpoint.enabled && endpoint.events.includes(eventType),
    ) ?? []
  );
}

function resolveNotificationChannels(
  event: NotificationEvent,
): Array<NotificationChannel> {
  return [...notificationChannelPolicy[event.type]];
}

async function enqueueNotificationDelivery(
  context: DbContext,
  channel: NotificationChannel,
  event: NotificationEvent,
) {
  switch (channel) {
    case "email": {
      const emailMessage = createEmailMessageFromNotification(event);
      await context.env.QUEUE.send({
        type: "EMAIL",
        data: emailMessage,
      });
      return;
    }
    case "webhook": {
      const config = await ConfigRepo.getSystemConfig(context.db);
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
      return;
    }
    default: {
      channel satisfies never;
      console.log(
        JSON.stringify({
          level: "error",
          message: "Unknown notification channel",
          channel,
        }),
      );
      throw new Error("Unknown notification channel");
    }
  }
}

export async function publishNotificationEvent(
  context: DbContext,
  event: NotificationEvent,
) {
  const parsed = notificationEventSchema.parse(event);
  const channels = resolveNotificationChannels(parsed);
  console.log(
    JSON.stringify({
      level: "info",
      message: "Notification published",
      eventType: parsed.type,
      channels,
    }),
  );
  await Promise.all(
    channels.map((channel) =>
      enqueueNotificationDelivery(context, channel, parsed),
    ),
  );
}
