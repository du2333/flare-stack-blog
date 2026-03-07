import type {
  NotificationChannel,
  NotificationEvent,
  NotificationEventType,
} from "@/features/notification/notification.schema";
import { notificationEventSchema } from "@/features/notification/notification.schema";
import { createEmailMessageFromNotification } from "@/features/email/service/email-message.mapper";

const notificationChannelPolicy = {
  "comment.created": ["email"],
  "comment.pending_review": ["email"],
  "comment.reply_published": ["email"],
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
  await Promise.all(
    channels.map((channel) =>
      enqueueNotificationDelivery(context, channel, parsed),
    ),
  );
}
