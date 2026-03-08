import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/lib/middlewares";
import { webhookEndpointSchema } from "@/features/webhook/webhook.schema";
import { NOTIFICATION_EVENT } from "@/features/notification/notification.schema";
import { sendWebhookRequest } from "@/features/webhook/api/webhook.consumer";
import { createNotificationExampleEvent } from "@/features/webhook/webhook.helpers";

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
