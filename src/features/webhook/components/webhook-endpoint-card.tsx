import { Eye, EyeOff, KeyRound, Loader2, Send, Trash2 } from "lucide-react";
import { WEBHOOK_EVENT_LABELS } from "./webhook-settings.helpers";
import type { FieldPath, FieldValues, UseFormRegister } from "react-hook-form";
import type { NotificationWebhookEventType } from "@/features/webhook/webhook.schema";
import { NOTIFICATION_WEBHOOK_EVENTS } from "@/features/webhook/webhook.schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface WebhookEndpointCardProps<TFieldValues extends FieldValues> {
  index: number;
  endpoint: {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
    secret: string;
    events: Array<NotificationWebhookEventType>;
  };
  register: UseFormRegister<TFieldValues>;
  visibleSecret: boolean;
  fieldError?: {
    name?: { message?: string };
    url?: { message?: string };
    secret?: { message?: string };
    events?: { message?: string };
  };
  isTesting: boolean;
  testingEndpointId?: string | null;
  onRemove: () => void;
  onToggleEnabled: (checked: boolean) => void;
  onToggleSecretVisibility: () => void;
  onToggleEvent: (
    eventType: NotificationWebhookEventType,
    checked: boolean,
  ) => void;
  onTest: () => void;
}

export function WebhookEndpointCard<TFieldValues extends FieldValues>({
  index,
  endpoint,
  register,
  visibleSecret,
  fieldError,
  isTesting,
  testingEndpointId,
  onRemove,
  onToggleEnabled,
  onToggleEvent,
  onToggleSecretVisibility,
  onTest,
}: WebhookEndpointCardProps<TFieldValues>) {
  return (
    <div className="overflow-hidden border border-border/30 bg-muted/5">
      <div className="flex flex-col gap-4 border-b border-border/20 px-6 py-4 md:flex-row md:items-center md:justify-between">
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
            onClick={onTest}
            disabled={isTesting && testingEndpointId === endpoint.id}
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
              onCheckedChange={onToggleEnabled}
            />
            启用
          </label>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-9 w-9 rounded-none text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div className="space-y-8 p-6">
        <div className="grid grid-cols-1 gap-x-12 gap-y-8 xl:grid-cols-2">
          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">名称</label>
            <Input
              {...register(
                `notification.webhooks.${index}.name` as FieldPath<TFieldValues>,
              )}
              placeholder="例如：Telegram Bot Relay"
              className="w-full rounded-none border border-border/30 bg-muted/10 px-4 py-6 text-sm"
            />
            {fieldError?.name?.message && (
              <p className="text-xs text-red-500">
                ! {fieldError.name.message}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">URL</label>
            <Input
              {...register(
                `notification.webhooks.${index}.url` as FieldPath<TFieldValues>,
              )}
              placeholder="https://hooks.example.com/notify"
              className="w-full rounded-none border border-border/30 bg-muted/10 px-4 py-6 text-sm"
            />
            {fieldError?.url?.message && (
              <p className="text-xs text-red-500">! {fieldError.url.message}</p>
            )}
          </div>
        </div>

        <div className="max-w-2xl space-y-3">
          <label className="text-sm text-muted-foreground">签名密钥</label>
          <div className="relative">
            <Input
              type={visibleSecret ? "text" : "password"}
              {...register(
                `notification.webhooks.${index}.secret` as FieldPath<TFieldValues>,
              )}
              placeholder="用于生成 X-Flare-Signature"
              className="w-full rounded-none border border-border/30 bg-muted/10 px-4 py-6 pr-12 text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleSecretVisibility}
              className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-none text-muted-foreground/40 hover:text-foreground"
            >
              {visibleSecret ? <EyeOff size={15} /> : <Eye size={15} />}
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
          {fieldError?.secret?.message && (
            <p className="text-xs text-red-500">
              ! {fieldError.secret.message}
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="space-y-1">
            <h6 className="text-sm font-medium text-foreground">通知事件</h6>
            <p className="text-sm text-muted-foreground">
              勾选后，相关管理员通知会发送到这个端点。
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {NOTIFICATION_WEBHOOK_EVENTS.map((eventType) => {
              const checked = endpoint.events.includes(eventType);

              return (
                <label
                  key={eventType}
                  className="flex cursor-pointer gap-4 border border-border/25 bg-background/40 px-4 py-4 transition-colors hover:bg-muted/5"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(nextChecked) =>
                      onToggleEvent(eventType, nextChecked)
                    }
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {WEBHOOK_EVENT_LABELS[eventType]}
                    </p>
                    <p className="break-all text-xs text-muted-foreground">
                      {eventType}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
          {fieldError?.events?.message && (
            <p className="text-xs text-red-500">
              ! {fieldError.events.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
