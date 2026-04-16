import { ChevronDown, Info } from "lucide-react";
import { useCallback, useMemo } from "react";
import type { NotificationEvent } from "@/features/notification/notification.schema";
import type { WebhookTranslationKey } from "@/features/webhook/webhook.helpers";
import {
  createNotificationExampleEvent,
  getWebhookExampleLabel,
} from "@/features/webhook/webhook.helpers";
import type { NotificationWebhookEventType } from "@/features/webhook/webhook.schema";
import { NOTIFICATION_WEBHOOK_EVENTS } from "@/features/webhook/webhook.schema";
import { m } from "@/paraglide/messages";
import { WEBHOOK_EVENT_LABELS } from "./webhook-settings.helpers";

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

function useWebhookDocTranslation() {
  return useCallback(
    (key: WebhookTranslationKey) => getWebhookExampleLabel(key),
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
            <h4 className="text-sm font-medium text-foreground">
              {m.settings_webhook_doc_title()}
            </h4>
            <div className="grid grid-cols-1 gap-x-12 gap-y-3 xl:grid-cols-2">
              <WebhookDocTip index="1">
                {m.settings_webhook_doc_tip1()}
              </WebhookDocTip>
              <WebhookDocTip index="2">
                {m.settings_webhook_doc_tip2()}
              </WebhookDocTip>
              <WebhookDocTip index="3">
                {m.settings_webhook_doc_tip3()}
              </WebhookDocTip>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 border border-border/30 bg-background/50 p-8">
        <div className="space-y-1">
          <h5 className="text-sm font-medium text-foreground">
            {m.settings_webhook_format_title()}
          </h5>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {m.settings_webhook_format_desc()}
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            <h6 className="text-sm font-medium text-foreground">
              {m.settings_webhook_header_title()}
            </h6>
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
              {m.settings_webhook_payload_title()}
            </h6>
            <div className="border border-border/20 bg-muted/10 p-4">
              <pre className="whitespace-pre-wrap break-all text-xs leading-6 text-muted-foreground">
                <code>{commonExamplePayload}</code>
              </pre>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h6 className="text-sm font-medium text-foreground">
            {m.settings_webhook_fields_title()}
          </h6>
          <p className="text-sm text-muted-foreground">
            {m.settings_webhook_fields_desc()}
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
                        {item.eventType} ·{" "}
                        {m.settings_webhook_fields_count({
                          count: item.fields.length,
                        })}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>

                  <div className="space-y-4 border-t border-border/20 px-4 py-4">
                    <div className="overflow-hidden border border-border/20">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead className="bg-muted/20 text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">
                              {m.settings_webhook_col_field()}
                            </th>
                            <th className="px-3 py-2 font-medium">
                              {m.settings_webhook_col_example()}
                            </th>
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
                      <pre className="whitespace-pre-wrap break-all text-xs leading-6 text-muted-foreground">
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
