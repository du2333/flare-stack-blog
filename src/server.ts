import { handleEmailMessage } from "@/features/email/email.queue";
import { app } from "@/lib/hono";
import { queueMessageSchema } from "@/lib/queue/queue.schema";

export { CommentModerationWorkflow } from "@/features/comments/workflows/comment-moderation";
export { PostProcessWorkflow } from "@/features/posts/workflows/post-process";
export { ScheduledPublishWorkflow } from "@/features/posts/workflows/scheduled-publish";
export { RateLimiter } from "@/lib/do/rate-limiter";
export { PasswordHasher } from "@/lib/do/password-hasher";

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
    return app.fetch(request, env, ctx);
  },
  async queue(batch, env) {
    for (const message of batch.messages) {
      const parsed = queueMessageSchema.safeParse(message.body);
      if (!parsed.success) {
        console.error(
          "[Queue] 无效消息:",
          JSON.stringify(message.body),
          parsed.error.message,
        );
        message.ack();
        continue;
      }

      try {
        const event = parsed.data;
        switch (event.type) {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          case "EMAIL":
            await handleEmailMessage(env, {
              ...event.data,
              idempotencyKey: message.id,
            });
            break;
          default:
            event.type satisfies never;
        }
        message.ack();
      } catch (error) {
        console.error(
          `[Queue] 处理失败 (attempt ${message.attempts}):`,
          error instanceof Error ? error.message : "未知错误",
        );
        message.retry();
      }
    }
  },
} satisfies ExportedHandler<Env>;
