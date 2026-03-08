import { ChevronDown, Info } from "lucide-react";
import { useCallback, useMemo } from "react";

import { WEBHOOK_EVENT_LABELS } from "./webhook-settings.helpers";
import type { WebhookTranslationKey } from "@/features/webhook/webhook.helpers";
import type { NotificationEvent } from "@/features/notification/notification.schema";
import type { NotificationWebhookEventType } from "@/features/webhook/webhook.schema";
import { createNotificationExampleEvent } from "@/features/webhook/webhook.helpers";
import { NOTIFICATION_WEBHOOK_EVENTS } from "@/features/webhook/webhook.schema";

interface NotificationDocField {
  path: string;
  example: string;
}

interface WebhookDocItem {
  eventType: NotificationWebhookEventType;
  event: NotificationEvent;
  fields: Array<NotificationDocField>;
}

function createEventFields(
  event: NotificationEvent,
): Array<NotificationDocField> {
  return Object.entries(event.data).map(([key, value]) => ({
    path: `data.${key}`,
    example: String(value),
  }));
}

function getWebhookDocItems(
  eventTypes: ReadonlyArray<NotificationWebhookEventType>,
  t: (key: WebhookTranslationKey) => string = (k) => k,
): Array<WebhookDocItem> {
  return eventTypes.map((eventType) => {
    const event = createNotificationExampleEvent(eventType, t);

    return {
      eventType,
      event,
      fields: createEventFields(event),
    };
  });
}

const WEBHOOK_DOC_EXAMPLE_LABELS: Record<WebhookTranslationKey, string> = {
  admin_email: "admin@example.com",
  post_title: "欢迎使用通知系统",
  commenter_name: "测试用户",
  comment_preview: "这是一条用于校验 Webhook 链路的测试评论。",
  review_url: "https://example.com/admin/comments",
  comment_url: "https://example.com/posts/welcome#comments",
  unsubscribe_url: "https://example.com/unsubscribe?token=test",
  replier_name: "测试用户",
  reply_preview: "这是一条用于检查回复通知的测试内容。",
  site_name: "测试站点",
  site_url: "https://example.com",
  description: "这是一个用于测试 Webhook 通知的示例友链申请。",
  submitter_name: "测试用户",
  friend_link_review_url: "https://example.com/admin/friend-links",
  subject: "[新评论] 欢迎使用通知系统",
  message: "测试用户在《欢迎使用通知系统》下发表了评论：这是一条示例评论。",
};

function useWebhookDocTranslation() {
  return useCallback(
    (key: WebhookTranslationKey) => WEBHOOK_DOC_EXAMPLE_LABELS[key],
    [],
  );
}

export function WebhookDocPanel() {
  const t = useWebhookDocTranslation();

  const webhookDocItems = useMemo(
    () => getWebhookDocItems(NOTIFICATION_WEBHOOK_EVENTS, t),
    [t],
  );

  const commonExamplePayload = JSON.stringify(
    {
      id: "msg_123456",
      type: "comment.admin_root_created",
      timestamp: "2026-03-07T12:34:56.000Z",
      source: "flare-stack-blog",
      test: false,
      data: { "...": "..." },
      subject: t("subject"),
      message: t("message"),
      html: "<!doctype html>...",
    },
    null,
    2,
  );

  return (
    <>
      <div className="group relative overflow-hidden border border-border/30 bg-muted/5 p-8 transition-all hover:bg-muted/10">
        <div className="relative z-10 flex items-start gap-6">
          <div className="rounded-full bg-foreground/5 p-3">
            <Info className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">使用说明</h4>
            <div className="grid grid-cols-1 gap-x-12 gap-y-3 xl:grid-cols-2">
              <WebhookDocTip index="1">
                Webhook 仅用于管理员侧通知，不向普通用户开放配置。
              </WebhookDocTip>
              <WebhookDocTip index="2">
                系统会对请求体做签名，便于接收端验证来源。
              </WebhookDocTip>
              <WebhookDocTip index="3">
                仅显示当前允许通过 webhook 分发的管理员事件。
              </WebhookDocTip>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 border border-border/30 bg-background/50 p-8">
        <div className="space-y-1">
          <h5 className="text-sm font-medium text-foreground">请求格式</h5>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Webhook 固定发送 <code>application/json</code>。接收端可以读取
            结构化字段 <code>type</code>、<code>data</code>，也可以直接复用
            <code>subject</code>、<code>message</code> 和 <code>html</code>。
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            <h6 className="text-sm font-medium text-foreground">请求头</h6>
            <div className="border border-border/20 bg-muted/10 p-4">
              <pre className="whitespace-pre-wrap break-all text-xs leading-6 text-muted-foreground">
                {`Content-Type: application/json
User-Agent: flare-stack-blog/webhook
X-Flare-Event: comment.admin_root_created
X-Flare-Timestamp: 2026-03-07T12:34:56.000Z
X-Flare-Signature: sha256=...`}
              </pre>
            </div>
          </div>

          <div className="space-y-3">
            <h6 className="text-sm font-medium text-foreground">
              示例 Payload
            </h6>
            <div className="border border-border/20 bg-muted/10 p-4">
              <pre className="overflow-x-auto text-xs leading-6 text-muted-foreground">
                <code>{commonExamplePayload}</code>
              </pre>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h6 className="text-sm font-medium text-foreground">事件字段</h6>
          <p className="text-sm text-muted-foreground">
            不同事件的 <code>data</code>{" "}
            字段不同。展开下面的事件项可以查看每个事件的字段和完整示例。
          </p>
          <div className="space-y-3">
            {webhookDocItems.map((item) => {
              const examplePayload = {
                id: "msg_123456",
                type: item.event.type,
                timestamp: "2026-03-07T12:34:56.000Z",
                source: "flare-stack-blog",
                test: false,
                data: item.event.data,
                subject: t("subject"),
                message: t("message"),
                html: "<!doctype html>...",
              };

              return (
                <details
                  key={item.eventType}
                  className="group border border-border/20 bg-muted/10"
                >
                  <summary className="flex list-none cursor-pointer items-center justify-between gap-4 px-4 py-4">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {WEBHOOK_EVENT_LABELS[item.eventType]}
                      </p>
                      <p className="break-all text-xs text-muted-foreground">
                        {item.eventType} · {item.fields.length} 个字段
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>

                  <div className="space-y-4 border-t border-border/20 px-4 py-4">
                    <div className="overflow-hidden border border-border/20">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead className="bg-muted/20 text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">字段</th>
                            <th className="px-3 py-2 font-medium">示例</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.fields.map((field) => (
                            <tr
                              key={field.path}
                              className="border-t border-border/10 text-muted-foreground"
                            >
                              <td className="px-3 py-2 font-mono text-foreground">
                                {field.path}
                              </td>
                              <td className="break-all px-3 py-2">
                                {field.example}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="border border-border/20 bg-background/40 p-4">
                      <pre className="overflow-x-auto text-xs leading-6 text-muted-foreground">
                        <code>{JSON.stringify(examplePayload, null, 2)}</code>
                      </pre>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function WebhookDocTip({
  index,
  children,
}: {
  index: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/50 text-[10px] font-mono text-muted-foreground">
        {index}
      </span>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  );
}
