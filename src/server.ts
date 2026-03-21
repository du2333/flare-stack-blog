import { handleEmailMessage } from "@/features/email/api/email.consumer";
import { handlePageviewMessages } from "@/features/pageview/api/pageview.consumer";
import { handlePostAutoSnapshotMessage } from "@/features/posts/api/post-auto-snapshot.consumer";
import { handleWebhookMessage } from "@/features/webhook/api/webhook.consumer";
import { queueMessageSchema } from "@/lib/queue/queue.schema";

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
        executionCtx: ExecutionContext<unknown>;
      };
    };
  }
}

export default {
  async fetch(request, env, ctx) {
    const { handleRootRequest } = await import("@/lib/worker/root-handler");
    return handleRootRequest(request, env, ctx);
  },
  async queue(batch, env, ctx) {
    // Collect PAGEVIEW messages for batch processing
    const pageviewBatch: {
      data: { postId: number; visitorHash: string };
      message: Message;
    }[] = [];

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
          case "PAGEVIEW":
            pageviewBatch.push({ data: event.data, message });
            continue; // Don't ack yet — handled in batch below
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

    // Batch process PAGEVIEW messages
    if (pageviewBatch.length > 0) {
      try {
        await handlePageviewMessages(
          { env },
          pageviewBatch.map((item) => item.data),
        );
        for (const item of pageviewBatch) item.message.ack();
      } catch (error) {
        console.error(
          JSON.stringify({
            message: "pageview batch processing failed",
            count: pageviewBatch.length,
            error: error instanceof Error ? error.message : "unknown error",
          }),
        );
        for (const item of pageviewBatch) item.message.retry();
      }
    }
  },
} satisfies ExportedHandler<Env>;
