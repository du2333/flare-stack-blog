import type { NotificationEvent } from "@/features/notification/notification.schema";
import { notificationEventSchema } from "@/features/notification/notification.schema";
import { createEmailMessageFromNotification } from "@/features/email/email.notification";

export async function publishNotificationEvent(
  context: Pick<DbContext, "env">,
  event: NotificationEvent,
) {
  const parsed = notificationEventSchema.parse(event);
  const emailMessage = createEmailMessageFromNotification(parsed);

  await context.env.QUEUE.send({
    type: "EMAIL",
    data: emailMessage,
  });
}
