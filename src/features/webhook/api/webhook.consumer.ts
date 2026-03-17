import { createEmailMessageFromNotification } from "@/features/email/service/email-message.mapper";
import type { NotificationEvent } from "@/features/notification/notification.schema";
import { serverEnv } from "@/lib/env/server.env";
import type { Locale } from "@/lib/i18n";
import type { WebhookMessage } from "@/lib/queue/queue.schema";
import { m } from "@/paraglide/messages";
import { baseLocale } from "@/paraglide/runtime";

function createPlainTextMessage(event: NotificationEvent, locale: Locale) {
  switch (event.type) {
    case "comment.admin_root_created":
      return m.email_webhook_comment_admin_root_message(
        {
          commentPreview: event.data.commentPreview,
          commentUrl: event.data.commentUrl,
          commenterName: event.data.commenterName,
          postTitle: event.data.postTitle,
        },
        { locale },
      );
    case "comment.admin_pending_review":
      return m.email_webhook_comment_admin_pending_message(
        {
          commentPreview: event.data.commentPreview,
          commenterName: event.data.commenterName,
          postTitle: event.data.postTitle,
          reviewUrl: event.data.reviewUrl,
        },
        { locale },
      );
    case "comment.reply_to_admin_published":
    case "comment.reply_to_user_published":
      return m.email_webhook_comment_reply_message(
        {
          commentUrl: event.data.commentUrl,
          postTitle: event.data.postTitle,
          replierName: event.data.replierName,
          replyPreview: event.data.replyPreview,
        },
        { locale },
      );
    case "friend_link.submitted":
      return m.email_webhook_friend_link_submitted_message(
        {
          siteName: event.data.siteName,
          siteUrl: event.data.siteUrl,
          submitterName: event.data.submitterName,
        },
        { locale },
      );
    case "friend_link.approved":
      return m.email_webhook_friend_link_approved_message(
        { siteName: event.data.siteName },
        { locale },
      );
    case "friend_link.rejected":
      return event.data.rejectionReason
        ? m.email_webhook_friend_link_rejected_message(
            {
              rejectionReason: event.data.rejectionReason,
              siteName: event.data.siteName,
            },
            { locale },
          )
        : m.email_webhook_friend_link_rejected_message_no_reason(
            { siteName: event.data.siteName },
            { locale },
          );
    default: {
      event satisfies never;
      throw new Error("Unknown notification event");
    }
  }
}

function createRenderedEmail(event: NotificationEvent, locale: Locale) {
  const email = createEmailMessageFromNotification(event, locale);

  return {
    subject: email.subject,
    message: createPlainTextMessage(event, locale),
    html: email.html,
  };
}

export function createWebhookBody(
  messageId: string,
  event: NotificationEvent,
  options?: {
    isTest?: boolean;
  },
  locale: Locale = baseLocale,
) {
  return {
    id: messageId,
    type: event.type,
    timestamp: new Date().toISOString(),
    source: "flare-stack-blog",
    test: options?.isTest ?? false,
    data: event.data,
    ...createRenderedEmail(event, locale),
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
  context: { env: Env },
  data: WebhookMessage["data"],
  messageId: string,
  options?: {
    isTest?: boolean;
  },
): Promise<void> {
  const locale = serverEnv(context.env).LOCALE;
  const body = createWebhookBody(messageId, data.event, options, locale);
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
    let errorDetail = "";
    try {
      errorDetail = await response.text();
    } catch {
      // Ignored
    }

    const errorMessage = m.settings_webhook_delivery_failed(
      {
        detail: errorDetail.slice(0, 1000),
        status: String(response.status),
        statusText: response.statusText,
      },
      { locale },
    );

    throw new Error(errorMessage);
  }
}

export async function handleWebhookMessage(
  context: { env: Env },
  data: WebhookMessage["data"],
  messageId: string,
): Promise<void> {
  await sendWebhookRequest(context, data, messageId);
}
