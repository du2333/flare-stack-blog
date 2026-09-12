import {
  CONFIG_ERRORS,
  SavedSecretInputSchema,
} from "@/features/config/config.admin.schema";
import { resolveTestSecret } from "@/features/config/service/config.service";
import { sendWebhookRequest } from "@/features/webhook/api/webhook.consumer";
import { createAdminRootExampleEvent } from "@/features/webhook/webhook.helpers";
import { testWebhookInputSchema } from "@/features/webhook/webhook.schema";
import { serverEnv } from "@/lib/env/server.env";
import { adminProcedure } from "@/lib/orpc/procedure";

const test = adminProcedure
  .errors(CONFIG_ERRORS)
  .route({
    method: "POST",
    path: "/admin/webhooks/test",
    summary: "Send a test webhook",
    description:
      "Tests the supplied connection without saving settings. The secret accepts replace with a new value or keep with the notification section expectedRevision; keep resolves the saved secret server-side and rejects stale revisions with CONFIG_CONFLICT. Saved secrets are never returned.",
    tags: ["Admin Webhooks"],
  })
  .input(
    testWebhookInputSchema.extend({ secret: SavedSecretInputSchema }).strict(),
  )
  .handler(async ({ context, input }) => {
    const locale = serverEnv(context.env).LOCALE;

    await sendWebhookRequest(
      { env: context.env },
      {
        url: input.url,
        secret: await resolveTestSecret(context, "webhookSecret", input.secret),
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
