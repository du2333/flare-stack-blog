import { handleEmailMessage } from "@/features/email/api/email.consumer";
import { handleWebhookMessage } from "@/features/webhook/api/webhook.consumer";
import { queueMessageSchema } from "@/lib/queue/queue.schema";

export async function handleQueueBatch(
  batch: MessageBatch,
  env: Env,
  ctx: ExecutionContext,
) {
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
}
