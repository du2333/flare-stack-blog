import { Eye, EyeOff, Globe, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SystemConfig } from "@/features/config/config.schema";
import { useWebhookConnection } from "@/features/webhook/hooks/use-webhook-connection";
import { m } from "@/paraglide/messages";

export function WebhookSettingsSection() {
  const [visibleSecret, setVisibleSecret] = useState(false);
  const {
    register,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<SystemConfig>();
  const { testWebhook, isTesting } = useWebhookConnection();

  const url = watch("notification.webhook.url") ?? "";
  const secret = watch("notification.webhook.secret") ?? "";
  const canTest = Boolean(url.trim() && secret.trim());
  const fieldError = errors.notification?.webhook;

  useEffect(() => {
    if (secret.trim()) return;
    setValue("notification.webhook.secret", crypto.randomUUID(), {
      shouldDirty: false,
    });
  }, [secret, setValue]);

  const handleTestWebhook = async () => {
    const endpoint = getValues("notification.webhook");
    if (!endpoint?.url.trim() || !endpoint.secret.trim()) {
      return;
    }

    try {
      await testWebhook({
        url: endpoint.url.trim(),
        secret: endpoint.secret,
      });
      toast.success(m.settings_webhook_toast_test_sent());
    } catch (error) {
      if (error instanceof Error) {
        toast.error(
          m.settings_webhook_toast_test_fail_msg({ message: error.message }),
        );
      } else {
        toast.error(m.settings_webhook_toast_test_fail());
      }
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {m.settings_webhook_doc()}
      </p>

      <div className="overflow-hidden divide-y divide-border/20 border border-border/30 bg-background/50">
        <div className="space-y-8 p-8">
          <div className="flex items-center gap-4">
            <div className="rounded-sm bg-muted/40 p-2">
              <Globe size={16} className="text-muted-foreground" />
            </div>
            <h5 className="text-sm font-medium text-foreground">
              {m.settings_webhook_endpoint_title()}
            </h5>
          </div>

          <div className="grid grid-cols-1 gap-x-12 gap-y-8 xl:grid-cols-2">
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground">
                {m.settings_webhook_endpoint_field_url()}
              </label>
              <Input
                {...register("notification.webhook.url")}
                placeholder={m.settings_webhook_endpoint_field_url_ph()}
                className="w-full rounded-none border border-border/30 bg-muted/10 px-4 py-6 text-sm"
              />
              {fieldError?.url?.message && (
                <p className="text-xs text-red-500">
                  ! {fieldError.url.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-sm text-muted-foreground">
                {m.settings_webhook_endpoint_field_secret()}
              </label>
              <div className="relative">
                <Input
                  type={visibleSecret ? "text" : "password"}
                  {...register("notification.webhook.secret")}
                  placeholder={m.settings_webhook_endpoint_field_secret_ph()}
                  className="w-full rounded-none border border-border/30 bg-muted/10 px-4 py-6 pr-12 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setVisibleSecret((prev) => !prev)}
                  className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 rounded-none text-muted-foreground/40 hover:text-foreground"
                >
                  {visibleSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                </Button>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {m.settings_webhook_endpoint_field_secret_hint()}
              </p>
              {fieldError?.secret?.message && (
                <p className="text-xs text-red-500">
                  ! {fieldError.secret.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 bg-muted/10 p-6 px-8 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            {m.settings_webhook_test_hint()}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleTestWebhook}
            disabled={isTesting || !canTest}
            className="h-10 rounded-none px-6 text-[10px] font-mono uppercase tracking-[0.15em]"
          >
            {isTesting ? (
              <Loader2 size={12} className="mr-2 animate-spin" />
            ) : (
              <Send size={12} className="mr-2" />
            )}
            {m.settings_webhook_endpoint_btn_test()}
          </Button>
        </div>
      </div>
    </div>
  );
}
