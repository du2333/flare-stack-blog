import { handleEmailMessage } from "@/features/email/api/email.consumer";
import { handlePageviewMessages } from "@/features/pageview/api/pageview.consumer";
import { handlePostAutoSnapshotMessage } from "@/features/posts/api/post-auto-snapshot.consumer";
import { handleWebhookMessage } from "@/features/webhook/api/webhook.consumer";
import { queueMessageSchema } from "@/lib/queue/queue.schema";

export async function handleQueueBatch(
  batch: MessageBatch,
  env: Env,
  ctx: ExecutionContext,
) {
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
          continue;
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
}
