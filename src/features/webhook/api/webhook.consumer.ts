import type { NotificationEvent } from "@/features/notification/notification.schema";
import {
  buildWebhookRequest,
  providerOf,
  webhookResponseError,
} from "@/features/webhook/webhook.providers";
import { serverEnv } from "@/lib/env/server.env";
import type { Locale } from "@/lib/i18n";
import type { WebhookMessage } from "@/lib/queue/queue.schema";
import { m } from "@/paraglide/messages";
import { baseLocale } from "@/paraglide/runtime";

function createPlainTextMessage(event: NotificationEvent, locale: Locale) {
  switch (event.type) {
    case "comment.admin_root_created": {
      const { commentPreview, commentUrl, commenterName } = event.data;
      return event.data.target === "moment"
        ? m.email_webhook_comment_admin_root_moment_message(
            {
              commentPreview,
              commentUrl,
              commenterName,
              momentTitle: event.data.postTitle,
            },
            { locale },
          )
        : m.email_webhook_comment_admin_root_message(
            {
              commentPreview,
              commentUrl,
              commenterName,
              postTitle: event.data.postTitle,
            },
            { locale },
          );
    }
    case "comment.reply_to_admin_published":
    case "comment.reply_to_user_published": {
      const { commentUrl, replierName, replyPreview } = event.data;
      return event.data.target === "moment"
        ? m.email_webhook_comment_reply_moment_message(
            {
              commentUrl,
              momentTitle: event.data.postTitle,
              replierName,
              replyPreview,
            },
            { locale },
          )
        : m.email_webhook_comment_reply_message(
            {
              commentUrl,
              postTitle: event.data.postTitle,
              replierName,
              replyPreview,
            },
            { locale },
          );
    }
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

function createTitle(event: NotificationEvent, locale: Locale) {
  switch (event.type) {
    case "comment.admin_root_created":
      return m.webhook_title_comment({}, { locale });
    case "comment.reply_to_admin_published":
    case "comment.reply_to_user_published":
      return m.webhook_title_reply({}, { locale });
    case "friend_link.submitted":
      return m.webhook_title_friend_link_submitted({}, { locale });
    case "friend_link.approved":
    case "friend_link.rejected":
      return m.webhook_title_friend_link_reviewed({}, { locale });
    default: {
      event satisfies never;
      throw new Error("Unknown notification event");
    }
  }
}

/** Where the notification takes the Admin: the comment, or the review page. */
function linkOf(event: NotificationEvent) {
  const data = event.data;
  if ("commentUrl" in data) return data.commentUrl;
  if ("reviewUrl" in data) return data.reviewUrl;
  if ("blogUrl" in data) return data.blogUrl;
  return "";
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
    test: options?.isTest ?? false,
    data: event.data,
    message: createPlainTextMessage(event, locale),
  };
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
  const { event: _, ...endpoint } = data;
  const request = await buildWebhookRequest(
    endpoint,
    {
      ...body,
      title: createTitle(data.event, locale),
      url: linkOf(data.event),
      data: body.data,
    },
    JSON.stringify(body),
  );

  const response = await fetch(request.url, {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: { "User-Agent": "flare-stack-blog/webhook", ...request.headers },
    body: request.body,
  });

  let text = "";
  try {
    text = await response.text();
  } catch {
    // Ignored
  }
  const detail = webhookResponseError(providerOf(endpoint), response.ok, text);
  if (detail !== null) {
    const status = {
      status: String(response.status),
      statusText: response.statusText,
    };
    throw new Error(
      detail.trim()
        ? m.settings_webhook_delivery_failed_detail(
            { ...status, detail: detail.trim().slice(0, 1000) },
            { locale },
          )
        : m.settings_webhook_delivery_failed(status, { locale }),
    );
  }
}

export async function handleWebhookMessage(
  context: { env: Env },
  data: WebhookMessage["data"],
  messageId: string,
): Promise<void> {
  await sendWebhookRequest(context, data, messageId);
}
