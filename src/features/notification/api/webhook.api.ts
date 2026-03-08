import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/lib/middlewares";
import { webhookEndpointSchema } from "@/features/config/config.schema";
import { NOTIFICATION_EVENT } from "@/features/notification/notification.schema";
import { sendWebhookRequest } from "@/features/notification/api/webhook.consumer";
import { createNotificationExampleEvent } from "@/features/notification/notification.helpers";

const testWebhookInputSchema = z.object({
  endpoint: webhookEndpointSchema,
});

export const testWebhookFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(testWebhookInputSchema)
  .handler(async ({ data }) => {
    const resolvedEventType =
      data.endpoint.events.length > 0
        ? data.endpoint.events[0]
        : NOTIFICATION_EVENT.COMMENT_ADMIN_ROOT_CREATED;

    await sendWebhookRequest(
      {
        endpointId: data.endpoint.id,
        url: data.endpoint.url,
        secret: data.endpoint.secret,
        event: createNotificationExampleEvent(resolvedEventType),
      },
      crypto.randomUUID(),
      {
        isTest: true,
      },
    );

    return {
      success: true,
    };
  });
