import type { NotificationEvent } from "@/features/notification/notification.schema";
import type { WebhookMessage } from "@/lib/queue/queue.schema";
import { createEmailMessageFromNotification } from "@/features/email/service/email-message.mapper";

function createPlainTextMessage(event: NotificationEvent) {
  switch (event.type) {
    case "comment.admin_root_created":
      return `${event.data.commenterName} 在《${event.data.postTitle}》下发表了评论：${event.data.commentPreview} ${event.data.commentUrl}`;
    case "comment.admin_pending_review":
      return `${event.data.commenterName} 在《${event.data.postTitle}》下发表了待审核评论：${event.data.commentPreview} ${event.data.reviewUrl}`;
    case "comment.reply_to_admin_published":
    case "comment.reply_to_user_published":
      return `${event.data.replierName} 回复了《${event.data.postTitle}》下的评论：${event.data.replyPreview} ${event.data.commentUrl}`;
    case "friend_link.submitted":
      return `${event.data.submitterName} 提交了友链申请：${event.data.siteName}（${event.data.siteUrl}）`;
    case "friend_link.approved":
      return `${event.data.siteName} 的友链申请已通过审核。`;
    case "friend_link.rejected":
      return event.data.rejectionReason
        ? `${event.data.siteName} 的友链申请未通过：${event.data.rejectionReason}`
        : `${event.data.siteName} 的友链申请未通过。`;
    default: {
      event satisfies never;
      throw new Error("Unknown notification event");
    }
  }
}

function createRenderedEmail(event: NotificationEvent) {
  const email = createEmailMessageFromNotification(event);

  return {
    subject: email.subject,
    message: createPlainTextMessage(event),
    html: email.html,
  };
}

export function createWebhookBody(
  messageId: string,
  event: NotificationEvent,
  options?: {
    isTest?: boolean;
  },
) {
  return {
    id: messageId,
    type: event.type,
    timestamp: new Date().toISOString(),
    source: "flare-stack-blog",
    test: options?.isTest ?? false,
    data: event.data,
    ...createRenderedEmail(event),
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

export async function sendWebhookRequest(
  data: WebhookMessage["data"],
  messageId: string,
  options?: {
    isTest?: boolean;
  },
): Promise<void> {
  const body = createWebhookBody(messageId, data.event, options);
  const payload = JSON.stringify(body);
  const timestamp = body.timestamp;
  const signature = await signPayload(data.secret, payload, timestamp);

  const response = await fetch(data.url, {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
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

export async function handleWebhookMessage(
  data: WebhookMessage["data"],
  messageId: string,
): Promise<void> {
  await sendWebhookRequest(data, messageId);
}
