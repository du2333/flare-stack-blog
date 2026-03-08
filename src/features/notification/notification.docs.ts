import type {
  NotificationEvent,
  NotificationWebhookEventType,
} from "@/features/notification/notification.schema";
import { NOTIFICATION_EVENT } from "@/features/notification/notification.schema";

type DocValueType = "string" | "number" | "boolean" | "object";

export interface NotificationDocField {
  path: string;
  type: DocValueType;
  required: boolean;
  example: string | number | boolean;
}

export interface WebhookDocItem {
  eventType: NotificationWebhookEventType;
  event: NotificationEvent;
  fields: Array<NotificationDocField>;
}

export function createNotificationExampleEvent(
  eventType: NotificationWebhookEventType,
): NotificationEvent {
  switch (eventType) {
    case NOTIFICATION_EVENT.COMMENT_ADMIN_ROOT_CREATED:
      return {
        type: NOTIFICATION_EVENT.COMMENT_ADMIN_ROOT_CREATED,
        data: {
          to: "admin@example.com",
          postTitle: "欢迎使用通知系统",
          commenterName: "测试用户",
          commentPreview: "这是一条用于校验 Webhook 链路的测试评论。",
          commentUrl: "https://example.com/admin/comments",
        },
      };
    case NOTIFICATION_EVENT.COMMENT_ADMIN_PENDING_REVIEW:
      return {
        type: NOTIFICATION_EVENT.COMMENT_ADMIN_PENDING_REVIEW,
        data: {
          to: "admin@example.com",
          postTitle: "欢迎使用通知系统",
          commenterName: "测试用户",
          commentPreview: "这是一条待审核的测试评论，用于检查通知链路。",
          reviewUrl: "https://example.com/admin/comments",
        },
      };
    case NOTIFICATION_EVENT.COMMENT_REPLY_TO_ADMIN_PUBLISHED:
      return {
        type: NOTIFICATION_EVENT.COMMENT_REPLY_TO_ADMIN_PUBLISHED,
        data: {
          to: "admin@example.com",
          postTitle: "欢迎使用通知系统",
          replierName: "测试用户",
          replyPreview: "这是一条用于检查回复通知的测试内容。",
          commentUrl: "https://example.com/posts/welcome#comments",
          unsubscribeUrl: "https://example.com/unsubscribe?token=test",
        },
      };
    case NOTIFICATION_EVENT.FRIEND_LINK_SUBMITTED:
      return {
        type: NOTIFICATION_EVENT.FRIEND_LINK_SUBMITTED,
        data: {
          to: "admin@example.com",
          siteName: "测试站点",
          siteUrl: "https://example.com",
          description: "这是一个用于测试 Webhook 通知的示例友链申请。",
          submitterName: "测试用户",
          reviewUrl: "https://example.com/admin/friend-links",
        },
      };
    default: {
      eventType satisfies never;
      throw new Error("Unknown notification event type");
    }
  }
}

function getDocValueType(value: unknown): DocValueType {
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "object";
}

function createEventFields(
  event: NotificationEvent,
): Array<NotificationDocField> {
  return Object.entries(event.data).map(([key, value]) => ({
    path: `data.${key}`,
    type: getDocValueType(value),
    required: true,
    example:
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
        ? value
        : JSON.stringify(value),
  }));
}

export function getWebhookDocItems(
  eventTypes: ReadonlyArray<NotificationWebhookEventType>,
): Array<WebhookDocItem> {
  return eventTypes.map((eventType) => {
    const event = createNotificationExampleEvent(eventType);

    return {
      eventType,
      event,
      fields: createEventFields(event),
    };
  });
}
