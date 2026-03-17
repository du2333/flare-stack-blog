import { handleEmailMessage } from "@/features/email/api/email.consumer";
import { handlePostAutoSnapshotMessage } from "@/features/posts/api/post-auto-snapshot.consumer";
import { handleWebhookMessage } from "@/features/webhook/api/webhook.consumer";
import { app } from "@/lib/hono";
import { queueMessageSchema } from "@/lib/queue/queue.schema";
import { paraglideMiddleware } from "@/paraglide/server";

export { CommentModerationWorkflow } from "@/features/comments/workflows/comment-moderation";
export { ExportWorkflow } from "@/features/import-export/workflows/export.workflow";
export { ImportWorkflow } from "@/features/import-export/workflows/import.workflow";
export { PostAutoSnapshotWorkflow } from "@/features/posts/workflows/post-auto-snapshot";
export { PostProcessWorkflow } from "@/features/posts/workflows/post-process";
export { ScheduledPublishWorkflow } from "@/features/posts/workflows/scheduled-publish";
export { PasswordHasher } from "@/lib/do/password-hasher";
export { RateLimiter } from "@/lib/do/rate-limiter";

declare module "@tanstack/react-start" {
  interface Register {
    server: {
      requestContext: {
        env: Env;
        executionCtx: ExecutionContext;
      };
    };
  }
}

export default {
  fetch(request, env, ctx) {
    return paraglideMiddleware(request, () => {
      return app.fetch(request, env, ctx);
    });
  },
  async queue(batch, env, ctx) {
    for (const message of batch.messages) {
      const parsed = queueMessageSchema.safeParse(message.body);
      if (!parsed.success) {
        console.error(
          JSON.stringify({
            message: "queue invalid message",
            body: message.body,
            error: parsed.error.message,
          }),
        );
        message.ack();
        continue;
      }

      try {
        const event = parsed.data;
        switch (event.type) {
          case "EMAIL":
            await handleEmailMessage(
              {
                env,
                executionCtx: ctx,
              },
              {
                ...event.data,
                idempotencyKey: message.id,
              },
            );
            break;
          case "WEBHOOK":
            await handleWebhookMessage({ env }, event.data, message.id);
            break;
          case "POST_AUTO_SNAPSHOT":
            await handlePostAutoSnapshotMessage({ env }, event.data);
            break;
          default:
            event satisfies never;
            throw new Error("Unknown queue message type");
        }
        message.ack();
      } catch (error) {
        console.error(
          JSON.stringify({
            message: "queue processing failed",
            attempt: message.attempts,
            error: error instanceof Error ? error.message : "unknown error",
          }),
        );
        message.retry();
      }
    }
  },
} satisfies ExportedHandler<Env>;
