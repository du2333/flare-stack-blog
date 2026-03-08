import {
  ChevronDown,
  Eye,
  EyeOff,
  Globe,
  Info,
  KeyRound,
  Loader2,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import type {
  NotificationEventType,
  NotificationWebhookEventType,
} from "@/features/notification/notification.schema";
import type { SystemConfig } from "@/features/config/config.schema";
import {
  NOTIFICATION_EVENT,
  NOTIFICATION_WEBHOOK_EVENTS,
} from "@/features/notification/notification.schema";
import { getWebhookDocItems } from "@/features/notification/notification.docs";
import { useWebhookConnection } from "@/features/notification/hooks/use-webhook-connection";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

const WEBHOOK_EVENT_LABELS: Record<NotificationWebhookEventType, string> = {
  [NOTIFICATION_EVENT.COMMENT_ADMIN_ROOT_CREATED]: "读者发表新评论",
  [NOTIFICATION_EVENT.COMMENT_ADMIN_PENDING_REVIEW]: "评论进入待审核",
  [NOTIFICATION_EVENT.COMMENT_REPLY_TO_ADMIN_PUBLISHED]:
    "读者回复博主评论",
  [NOTIFICATION_EVENT.FRIEND_LINK_SUBMITTED]: "收到新的友链申请",
};

function createWebhookEndpoint() {
  return {
    id: crypto.randomUUID(),
    name: "",
    url: "",
    enabled: true,
    secret: crypto.randomUUID(),
    events: [
      ...NOTIFICATION_WEBHOOK_EVENTS,
    ] satisfies Array<NotificationEventType>,
  };
}

export function WebhookSettingsSection() {
  const [visibleSecrets, setVisibleSecrets] = useState<Record<number, boolean>>(
    {},
  );
  const {
    register,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<SystemConfig>();
  const { testWebhook, isTesting, testingEndpointId } = useWebhookConnection();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "notification.webhooks",
  });

  const webhookFields = watch("notification.webhooks") ?? [];
  const webhookDocItems = useMemo(
    () => getWebhookDocItems(NOTIFICATION_WEBHOOK_EVENTS),
    [],
  );
  const enabledCount = useMemo(
    () => webhookFields.filter((endpoint) => endpoint.enabled).length,
    [webhookFields],
  );

  const toggleSecretVisibility = (index: number) => {
    setVisibleSecrets((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const toggleEvent = (
    endpointIndex: number,
    eventType: NotificationWebhookEventType,
    checked: boolean,
  ) => {
    const current = webhookFields[endpointIndex]?.events ?? [];
    const next = checked
      ? [...new Set([...current, eventType])]
      : current.filter((event) => event !== eventType);

    setValue(`notification.webhooks.${endpointIndex}.events`, next, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handleTestWebhook = async (endpointIndex: number) => {
    const endpoint = getValues(`notification.webhooks.${endpointIndex}`);

    if (!endpoint) {
      return;
    }

    try {
      await testWebhook({
        data: {
          endpoint,
        },
      });
      toast.success("测试请求已发送");
    } catch {
      toast.error("测试请求发送失败");
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="group relative border border-border/30 bg-muted/5 p-8 overflow-hidden transition-all hover:bg-muted/10">
        <div className="flex gap-6 items-start relative z-10">
          <div className="p-3 bg-foreground/5 rounded-full">
            <Info className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">使用说明</h4>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/50 text-[10px] font-mono text-muted-foreground">
                  1
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Webhook 仅用于管理员侧通知，不向普通用户开放配置。
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/50 text-[10px] font-mono text-muted-foreground">
                  2
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  系统会对请求体做签名，便于接收端验证来源。
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/50 text-[10px] font-mono text-muted-foreground">
                  3
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  仅显示当前允许通过 webhook 分发的管理员事件。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-border/30 bg-background/50 p-8 space-y-6">
        <div className="space-y-1">
          <h5 className="text-sm font-medium text-foreground">请求格式</h5>
          <p className="text-sm text-muted-foreground leading-relaxed">
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
                <code>{`{
  "id": "msg_123456",
  "type": "comment.admin_root_created",
  "timestamp": "2026-03-07T12:34:56.000Z",
  "source": "flare-stack-blog",
  "test": false,
  "data": { ... },
  "subject": "[新评论] 欢迎使用通知系统",
  "message": "测试用户在《欢迎使用通知系统》下发表了评论：这是一条示例评论。",
  "html": "<!doctype html>..."
}`}</code>
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
                subject: "...",
                message: "...",
                html: "<!doctype html>...",
              };

              return (
                <details
                  key={item.eventType}
                  className="group border border-border/20 bg-muted/10"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {WEBHOOK_EVENT_LABELS[item.eventType]}
                      </p>
                      <p className="text-xs text-muted-foreground break-all">
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
                              <td className="px-3 py-2 break-all">
                                {String(field.example)}
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

      <div className="border border-border/30 bg-background/50 overflow-hidden divide-y divide-border/20">
        <div className="p-8 space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-muted/40 rounded-sm">
                <Globe size={16} className="text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h5 className="text-sm font-medium text-foreground">
                  Webhook 端点
                </h5>
                <p className="text-sm text-muted-foreground">
                  已启用 {enabledCount} 个，共 {fields.length} 个
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => append(createWebhookEndpoint())}
              className="h-10 px-6 rounded-none text-[10px] font-mono uppercase tracking-[0.2em]"
            >
              <Plus size={12} className="mr-3" />
              添加端点
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="border border-dashed border-border/40 bg-muted/5 p-10 text-center">
              <p className="text-sm font-serif text-foreground">
                暂无 Webhook 端点
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                新增一个端点后，管理员通知就可以转发到外部平台。
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {fields.map((field, index) => {
                const endpoint = webhookFields[index] ?? field;
                const fieldError = errors.notification?.webhooks?.[index];

                return (
                  <div
                    key={field.id}
                    className="border border-border/30 bg-muted/5 overflow-hidden"
                  >
                    <div className="px-6 py-4 border-b border-border/20 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          端点 {String(index + 1).padStart(2, "0")}
                        </p>
                        <p className="text-base font-serif text-foreground">
                          {endpoint.name.trim() || "未命名端点"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 md:gap-6">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleTestWebhook(index)}
                          disabled={
                            isTesting && testingEndpointId === endpoint.id
                          }
                          className="h-9 rounded-none px-4 text-[10px] font-mono uppercase tracking-[0.15em]"
                        >
                          {isTesting && testingEndpointId === endpoint.id ? (
                            <Loader2 size={12} className="mr-2 animate-spin" />
                          ) : (
                            <Send size={12} className="mr-2" />
                          )}
                          发送测试
                        </Button>
                        <label className="flex items-center gap-3 text-xs text-muted-foreground">
                          <Checkbox
                            checked={endpoint.enabled}
                            onCheckedChange={(checked) =>
                              setValue(
                                `notification.webhooks.${index}.enabled`,
                                checked,
                                {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                  shouldValidate: true,
                                },
                              )
                            }
                          />
                          启用
                        </label>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="h-9 w-9 rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>

                    <div className="p-6 space-y-8">
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-8">
                        <div className="space-y-3">
                          <label className="text-sm text-muted-foreground">
                            名称
                          </label>
                          <Input
                            {...register(`notification.webhooks.${index}.name`)}
                            placeholder="例如：Telegram Bot Relay"
                            className="w-full bg-muted/10 border border-border/30 rounded-none py-6 text-sm px-4"
                          />
                          {fieldError?.name && (
                            <p className="text-xs text-red-500">
                              ! {fieldError.name.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <label className="text-sm text-muted-foreground">
                            URL
                          </label>
                          <Input
                            {...register(`notification.webhooks.${index}.url`)}
                            placeholder="https://hooks.example.com/notify"
                            className="w-full bg-muted/10 border border-border/30 rounded-none py-6 text-sm px-4"
                          />
                          {fieldError?.url && (
                            <p className="text-xs text-red-500">
                              ! {fieldError.url.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 max-w-2xl">
                        <label className="text-sm text-muted-foreground">
                          签名密钥
                        </label>
                        <div className="relative">
                          <Input
                            type={visibleSecrets[index] ? "text" : "password"}
                            {...register(
                              `notification.webhooks.${index}.secret`,
                            )}
                            placeholder="用于生成 X-Flare-Signature"
                            className="w-full bg-muted/10 border border-border/30 rounded-none py-6 text-sm px-4 pr-12"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleSecretVisibility(index)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-none text-muted-foreground/40 hover:text-foreground"
                          >
                            {visibleSecrets[index] ? (
                              <EyeOff size={15} />
                            ) : (
                              <Eye size={15} />
                            )}
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <KeyRound size={12} className="shrink-0" />
                          <p className="leading-5">
                            如需校验来源，可使用该密钥验证
                            <code className="mx-1">X-Flare-Signature</code>
                            请求头。
                          </p>
                        </div>
                        {fieldError?.secret && (
                          <p className="text-xs text-red-500">
                            ! {fieldError.secret.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-5">
                        <div className="space-y-1">
                          <h6 className="text-sm font-medium text-foreground">
                            通知事件
                          </h6>
                          <p className="text-sm text-muted-foreground">
                            勾选后，相关管理员通知会发送到这个端点。
                          </p>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {NOTIFICATION_WEBHOOK_EVENTS.map((eventType) => {
                            const checked = endpoint.events.includes(eventType);

                            return (
                              <label
                                key={eventType}
                                className="flex gap-4 border border-border/25 bg-background/40 px-4 py-4 cursor-pointer hover:bg-muted/5 transition-colors"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(nextChecked) =>
                                    toggleEvent(index, eventType, nextChecked)
                                  }
                                />
                                <div className="space-y-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">
                                    {WEBHOOK_EVENT_LABELS[eventType]}
                                  </p>
                                  <p className="text-xs text-muted-foreground break-all">
                                    {eventType}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        {fieldError?.events && (
                          <p className="text-xs text-red-500">
                            ! {fieldError.events.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
