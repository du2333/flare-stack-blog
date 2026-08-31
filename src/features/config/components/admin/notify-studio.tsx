import { Eye, EyeOff, Loader2, MessageCircle, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { SETTINGS_FIELD_CLASS } from "@/features/config/components/admin/settings-pages";
import type { SystemConfig } from "@/features/config/config.schema";
import { useEmailConnection } from "@/features/email/hooks/use-email-connection";
import { useWebhookConnection } from "@/features/webhook/hooks/use-webhook-connection";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function NotifyStudio() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <EmailChannel />
      <WebhookChannel />
    </div>
  );
}

function EmailChannel() {
  const { register, setValue, control } = useFormContext<SystemConfig>();
  const { testEmailConnection } = useEmailConnection();
  const [openAccount, setOpenAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const email = useWatch({ control, name: "email" });
  const adminOn =
    useWatch({ control, name: "notification.admin.channels.email" }) ?? true;
  const userOn =
    useWatch({ control, name: "notification.user.emailEnabled" }) ?? true;
  const siteTitle = useWatch({ control, name: "site.title" }) ?? "";
  const senderName = email?.senderName?.trim() || "";
  const host = email?.host?.trim() || "";
  const senderAddress = email?.senderAddress?.trim() || "";
  const configured = Boolean(
    host && email?.username?.trim() && email?.password?.trim() && senderAddress,
  );

  useEffect(() => {
    if (!configured) setOpenAccount(true);
  }, [configured]);

  const handleTest = async () => {
    if (!configured || testing) return;
    setTesting(true);
    try {
      await testEmailConnection({
        host,
        port: email?.port || 465,
        username: email?.username || "",
        password: email?.password || "",
        senderAddress,
        senderName: email?.senderName,
      });
      toast.success(m.settings_email_test_status_success());
    } catch (error) {
      toast.error(m.settings_email_test_status_error(), {
        description:
          error instanceof Error
            ? error.message
            : m.settings_email_unknown_error(),
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="rounded-2xl bg-(--fuwari-btn-regular-bg)/55 p-4 md:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium fuwari-text-90">
            {m.settings_tab_email()}
          </h2>
          <button
            type="button"
            onClick={() => setOpenAccount((open) => !open)}
            className="mt-1 text-xs fuwari-text-50 hover:text-(--fuwari-primary)"
          >
            {[host, senderAddress].filter(Boolean).join(" · ") ||
              m.settings_email_account()}
          </button>
        </div>
        <span
          className={cn(
            "shrink-0 h-6 px-2 rounded-full text-xs grid place-items-center",
            configured
              ? "bg-(--fuwari-success-bg) text-(--fuwari-success-fg)"
              : "bg-(--fuwari-btn-regular-bg) fuwari-text-50",
          )}
        >
          {configured ? m.settings_connected() : m.settings_not_connected()}
        </span>
      </div>

      <div className="fuwari-card-base p-4 space-y-2">
        <p className="text-sm font-medium fuwari-text-90">
          {senderName ||
            siteTitle ||
            m.settings_email_creds_sender_name_label()}
        </p>
        <p className="text-sm fuwari-text-75">
          {m.email_comment_admin_root_subject({
            postTitle: m.webhook_example_post_title(),
          })}
        </p>
        <p className="text-sm fuwari-text-50 leading-relaxed">
          {m.email_comment_admin_root_preview({
            commenterName: m.webhook_example_commenter_name(),
            postTitle: m.webhook_example_post_title(),
          })}
        </p>
      </div>

      <SwitchRow
        label={m.settings_email_scope_admin_label()}
        checked={adminOn}
        onChange={(checked) =>
          setValue("notification.admin.channels.email", checked, {
            shouldDirty: true,
          })
        }
      />
      <SwitchRow
        label={m.settings_email_scope_user_label()}
        checked={userOn}
        onChange={(checked) =>
          setValue("notification.user.emailEnabled", checked, {
            shouldDirty: true,
          })
        }
      />

      {openAccount ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={m.settings_email_creds_host_label()}>
            <input
              {...register("email.host")}
              placeholder={m.settings_email_creds_host_ph()}
              className={SETTINGS_FIELD_CLASS}
            />
          </Field>
          <Field label={m.settings_email_creds_port_label()}>
            <input
              type="number"
              {...register("email.port", { valueAsNumber: true })}
              placeholder={m.settings_email_creds_port_ph()}
              className={SETTINGS_FIELD_CLASS}
            />
          </Field>
          <Field label={m.settings_email_creds_username_label()}>
            <input
              {...register("email.username")}
              placeholder={m.settings_email_creds_username_ph()}
              className={SETTINGS_FIELD_CLASS}
            />
          </Field>
          <Field label={m.settings_email_creds_password_label()}>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                {...register("email.password")}
                placeholder={m.settings_email_creds_password_ph()}
                className={cn(SETTINGS_FIELD_CLASS, "pr-10")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center fuwari-text-50"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
          <Field label={m.settings_email_creds_sender_name_label()}>
            <input
              {...register("email.senderName")}
              placeholder={m.settings_email_creds_sender_name_ph()}
              className={SETTINGS_FIELD_CLASS}
            />
          </Field>
          <Field label={m.settings_email_creds_sender_addr_label()}>
            <input
              type="email"
              {...register("email.senderAddress")}
              placeholder={m.settings_email_creds_sender_addr_ph()}
              className={SETTINGS_FIELD_CLASS}
            />
          </Field>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void handleTest()}
        disabled={!configured || testing}
        className="fuwari-btn-regular rounded-xl h-9 px-3 text-sm font-medium gap-1.5 disabled:opacity-50"
      >
        {testing ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Send size={14} />
        )}
        {m.settings_email_test_btn_send()}
      </button>
    </section>
  );
}

function WebhookChannel() {
  const { register, watch, setValue, getValues, formState } =
    useFormContext<SystemConfig>();
  const { testWebhook, isTesting } = useWebhookConnection();
  const [visibleSecret, setVisibleSecret] = useState(false);
  const url = watch("notification.webhook.url") ?? "";
  const secret = watch("notification.webhook.secret") ?? "";
  const canTest = Boolean(url.trim() && secret.trim());
  const fieldError = formState.errors.notification?.webhook;

  useEffect(() => {
    if (secret.trim()) return;
    setValue("notification.webhook.secret", crypto.randomUUID(), {
      shouldDirty: false,
    });
  }, [secret, setValue]);

  const handleTest = async () => {
    const endpoint = getValues("notification.webhook");
    if (!endpoint?.url.trim() || !endpoint.secret.trim()) return;
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
    <section className="rounded-2xl bg-(--fuwari-btn-regular-bg)/55 p-4 md:p-5 space-y-4">
      <h2 className="text-base font-medium fuwari-text-90">
        {m.settings_webhook_endpoint_title()}
      </h2>

      <Field label={m.settings_webhook_endpoint_field_url()}>
        <input
          {...register("notification.webhook.url")}
          placeholder={m.settings_webhook_endpoint_field_url_ph()}
          className={SETTINGS_FIELD_CLASS}
        />
        {fieldError?.url?.message ? (
          <p className="text-xs text-(--fuwari-danger-fg)">
            {fieldError.url.message}
          </p>
        ) : null}
      </Field>

      <Field label={m.settings_webhook_endpoint_field_secret()}>
        <div className="relative">
          <input
            type={visibleSecret ? "text" : "password"}
            {...register("notification.webhook.secret")}
            placeholder={m.settings_webhook_endpoint_field_secret_ph()}
            className={cn(SETTINGS_FIELD_CLASS, "pr-10")}
          />
          <button
            type="button"
            onClick={() => setVisibleSecret((value) => !value)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center fuwari-text-50"
          >
            {visibleSecret ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {fieldError?.secret?.message ? (
          <p className="text-xs text-(--fuwari-danger-fg)">
            {fieldError.secret.message}
          </p>
        ) : null}
      </Field>

      <button
        type="button"
        onClick={() => void handleTest()}
        disabled={!canTest || isTesting}
        className="fuwari-btn-regular rounded-xl h-9 px-3 text-sm font-medium gap-1.5 disabled:opacity-50"
      >
        {isTesting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Send size={14} />
        )}
        {m.settings_webhook_endpoint_btn_test()}
      </button>

      <div className="fuwari-card-base p-4 space-y-2">
        <p className="text-xs fuwari-text-50">{m.settings_webhook_sample()}</p>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 w-2 h-2 rounded-full bg-(--fuwari-success) shrink-0" />
          <MessageCircle size={16} className="fuwari-text-50 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-mono fuwari-text-50">
              comment.admin_root_created
            </p>
            <p className="text-sm fuwari-text-75 leading-relaxed">
              {m.webhook_example_message()}
            </p>
          </div>
        </div>
      </div>
      <p className="text-xs fuwari-text-50">{m.settings_webhook_empty()}</p>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm fuwari-text-50">
      {label}
      {children}
    </label>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-1 text-left"
    >
      <span className="text-sm fuwari-text-90">{label}</span>
      <span
        className={cn(
          "relative h-6 w-10 rounded-full shrink-0 transition-colors",
          checked ? "bg-(--fuwari-primary)" : "bg-(--fuwari-btn-regular-bg)",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-4",
          )}
        />
      </span>
    </button>
  );
}
