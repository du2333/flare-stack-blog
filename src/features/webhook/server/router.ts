import { sendWebhookRequest } from "@/features/webhook/api/webhook.consumer";
import { createAdminRootExampleEvent } from "@/features/webhook/webhook.helpers";
import { testWebhookInputSchema } from "@/features/webhook/webhook.schema";
import { serverEnv } from "@/lib/env/server.env";
import { adminProcedure } from "@/lib/orpc/procedure";

const test = adminProcedure
  .route({
    method: "POST",
    path: "/admin/webhooks/test",
    summary: "Send a test webhook",
    tags: ["Admin Webhooks"],
  })
  .input(testWebhookInputSchema)
  .handler(async ({ context, input }) => {
    const locale = serverEnv(context.env).LOCALE;

    await sendWebhookRequest(
      { env: context.env },
      {
        url: input.url,
        secret: input.secret,
        event: createAdminRootExampleEvent(locale),
      },
      crypto.randomUUID(),
      { isTest: true },
    );

    return { success: true };
  });

export default {
  test,
};
