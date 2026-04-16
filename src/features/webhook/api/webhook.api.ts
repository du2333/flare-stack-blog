import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { NOTIFICATION_EVENT } from "@/features/notification/notification.schema";
import { sendWebhookRequest } from "@/features/webhook/api/webhook.consumer";
import {
  createNotificationExampleEvent,
  getWebhookExampleLabel,
} from "@/features/webhook/webhook.helpers";
import { webhookEndpointSchema } from "@/features/webhook/webhook.schema";
import { serverEnv } from "@/lib/env/server.env";
import { adminMiddleware } from "@/lib/middlewares";

const testWebhookInputSchema = z.object({
  endpoint: webhookEndpointSchema,
});

export const testWebhookFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(testWebhookInputSchema)
  .handler(async ({ context, data }) => {
    const resolvedEventType =
      data.endpoint.events.length > 0
        ? data.endpoint.events[0]
        : NOTIFICATION_EVENT.COMMENT_ADMIN_ROOT_CREATED;
    const locale = serverEnv(context.env).LOCALE;

    await sendWebhookRequest(
      { env: context.env },
      {
        endpointId: data.endpoint.id,
        url: data.endpoint.url,
        secret: data.endpoint.secret,
        event: createNotificationExampleEvent(resolvedEventType, (k) =>
          getWebhookExampleLabel(k, { locale }),
        ),
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
