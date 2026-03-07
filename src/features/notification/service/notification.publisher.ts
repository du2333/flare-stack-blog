import type {
  NotificationChannel,
  NotificationEvent,
  NotificationEventType,
} from "@/features/notification/notification.schema";
import { notificationEventSchema } from "@/features/notification/notification.schema";
import { createEmailMessageFromNotification } from "@/features/email/service/email-message.mapper";

const notificationChannelPolicy = {
  "comment.admin_root_created": ["email"],
  "comment.admin_pending_review": ["email"],
  "comment.reply_to_admin_published": ["email"],
  "comment.reply_to_user_published": ["email"],
  "friend_link.submitted": ["email"],
  "friend_link.approved": ["email"],
  "friend_link.rejected": ["email"],
} as const satisfies Record<
  NotificationEventType,
  ReadonlyArray<NotificationChannel>
>;

function resolveNotificationChannels(
  event: NotificationEvent,
): Array<NotificationChannel> {
  return [...notificationChannelPolicy[event.type]];
}

async function enqueueNotificationDelivery(
  context: Pick<DbContext, "env">,
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
    case "webhook":
      // Reserved for the future webhook channel.
      return;
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
  context: Pick<DbContext, "env">,
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
