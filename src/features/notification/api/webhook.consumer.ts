import type { NotificationEvent } from "@/features/notification/notification.schema";
import type { WebhookMessage } from "@/lib/queue/queue.schema";

function createWebhookBody(messageId: string, event: NotificationEvent) {
  return {
    id: messageId,
    type: event.type,
    timestamp: new Date().toISOString(),
    source: "flare-stack-blog",
    data: event.data,
  };
}

async function signPayload(secret: string, payload: string, timestamp: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${payload}`),
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function handleWebhookMessage(
  data: WebhookMessage["data"],
  messageId: string,
): Promise<void> {
  const body = createWebhookBody(messageId, data.event);
  const payload = JSON.stringify(body);
  const timestamp = body.timestamp;
  const signature = await signPayload(data.secret, payload, timestamp);

  const response = await fetch(data.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "flare-stack-blog/webhook",
      "X-Flare-Event": data.event.type,
      "X-Flare-Timestamp": timestamp,
      "X-Flare-Signature": `sha256=${signature}`,
    },
    body: payload,
  });

  if (!response.ok) {
    throw new Error(
      `webhook delivery failed: ${response.status} ${response.statusText}`,
    );
  }
}
