import { z } from "zod";
import { NOTIFICATION_EVENT } from "@/features/notification/notification.schema";
import { sendWebhookRequest } from "@/features/webhook/api/webhook.consumer";
import {
  createNotificationExampleEvent,
  getWebhookExampleLabel,
} from "@/features/webhook/webhook.helpers";
import { webhookEndpointSchema } from "@/features/webhook/webhook.schema";
import { serverEnv } from "@/lib/env/server.env";
import { adminProcedure } from "@/lib/orpc/procedure";

const test = adminProcedure
  .route({
    method: "POST",
    path: "/admin/webhooks/test",
    summary: "Send a test webhook",
    tags: ["Admin Webhooks"],
  })
  .input(z.object({ endpoint: webhookEndpointSchema }))
  .handler(async ({ context, input }) => {
    const resolvedEventType =
      input.endpoint.events.length > 0
        ? input.endpoint.events[0]
        : NOTIFICATION_EVENT.COMMENT_ADMIN_ROOT_CREATED;
    const locale = serverEnv(context.env).LOCALE;

    await sendWebhookRequest(
      { env: context.env },
      {
        endpointId: input.endpoint.id,
        url: input.endpoint.url,
        secret: input.endpoint.secret,
        event: createNotificationExampleEvent(resolvedEventType, (k) =>
          getWebhookExampleLabel(k, { locale }),
        ),
      },
      crypto.randomUUID(),
      { isTest: true },
    );

    return { success: true };
  });

export default {
  test,
};
