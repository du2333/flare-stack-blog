import { Globe, Plus } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { WebhookDocPanel } from "./webhook-doc-panel";
import { WebhookEndpointCard } from "./webhook-endpoint-card";
import { createWebhookEndpoint } from "./webhook-settings.helpers";
import type { NotificationWebhookEventType } from "@/features/webhook/webhook.schema";
import type { SystemConfig } from "@/features/config/config.schema";
import { useWebhookConnection } from "@/features/webhook/hooks/use-webhook-connection";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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
  const adminWebhookEnabled =
    watch("notification.admin.channels.webhook") ?? true;
  const enabledCount = webhookFields.filter(
    (endpoint) => endpoint.enabled,
  ).length;

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
      <WebhookDocPanel />

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

          <label className="flex items-center gap-4 border border-border/20 bg-muted/10 p-4 cursor-pointer hover:bg-muted/20 transition-colors">
            <Checkbox
              checked={adminWebhookEnabled}
              onCheckedChange={(checked) =>
                setValue("notification.admin.channels.webhook", checked, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                })
              }
            />
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                开启管理员 Webhook 此渠道通知
              </p>
              <p className="text-sm text-muted-foreground break-all">
                全局开关。关闭后，不再向所有端点发送相关事件；开启后，下方可单独启停各端点。
              </p>
            </div>
          </label>

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
                  <WebhookEndpointCard<SystemConfig>
                    key={field.id}
                    index={index}
                    endpoint={endpoint}
                    register={register}
                    visibleSecret={!!visibleSecrets[index]}
                    fieldError={fieldError}
                    isTesting={isTesting}
                    testingEndpointId={testingEndpointId}
                    onTest={() => handleTestWebhook(index)}
                    onRemove={() => remove(index)}
                    onToggleEnabled={(checked) =>
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
                    onToggleSecretVisibility={() =>
                      toggleSecretVisibility(index)
                    }
                    onToggleEvent={(eventType, checked) =>
                      toggleEvent(index, eventType, checked)
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
