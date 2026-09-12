import { SettingsDisclosure } from "./settings-disclosure";
import { useMediaQuery } from "@/hooks/use-motion";
import { SecretControl } from "./secret-control";
import { useConfigEditing, type ConfigFormValues } from "./config-editing";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { useState, useId, Children, isValidElement, cloneElement } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { SETTINGS_FIELD_CLASS } from "@/features/config/components/admin/settings-pages";
import type { SystemConfig } from "@/features/config/config.schema";
import type { AdminTestEmailConnectionInput } from "@/features/email/email.schema";
import { useEmailConnection } from "@/features/email/hooks/use-email-connection";
import { useWebhookConnection } from "@/features/webhook/hooks/use-webhook-connection";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function NotifyStudio() {
  return (
    <div className="notify-studio">
      <EmailChannel />
      <WebhookChannel />
    </div>
  );
}

function EmailChannel() {
  const widePreview = useMediaQuery("(min-width:1051px)");
  const { register, setValue, control, getValues } =
    useFormContext<ConfigFormValues>();
  const { testEmailConnection } = useEmailConnection();
  const { secrets, revisions } = useConfigEditing();
  const clearPassword = useWatch({ control, name: "clearEmailPassword" });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    input: AdminTestEmailConnectionInput;
    success: boolean;
  } | null>(null);
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
    host &&
    email?.username?.trim() &&
    !clearPassword &&
    (email?.password || secrets.emailPasswordConfigured) &&
    senderAddress,
  );

  const testInput = emailTestInput(email, revisions.notifications);
  // Results describe only the exact values tested, including an in-flight edit.
  const matchesTest =
    testResult !== null && sameEmailInput(testResult.input, testInput);
  const connectionStatus = testing
    ? "testing"
    : !configured
      ? "unconfigured"
      : matchesTest
        ? testResult.success
          ? "verified"
          : "failed"
        : "configured";
  const connectionLabels = {
    testing: m.settings_connection_testing(),
    unconfigured: m.settings_connection_unconfigured(),
    configured: m.settings_connection_configured(),
    verified: m.settings_connection_verified(),
    failed: m.settings_connection_failed(),
  };

  const handleTest = async () => {
    if (!configured || testing) return;
    setTesting(true);
    try {
      await testEmailConnection(testInput);
      setTestResult({ input: testInput, success: true });
      if (
        sameEmailInput(
          testInput,
          emailTestInput(getValues("email"), revisions.notifications),
        )
      ) {
        toast.success(m.settings_email_test_status_success());
      }
    } catch (error) {
      setTestResult({ input: testInput, success: false });
      if (
        sameEmailInput(
          testInput,
          emailTestInput(getValues("email"), revisions.notifications),
        )
      ) {
        toast.error(m.settings_email_test_status_error(), {
          description:
            error instanceof Error
              ? error.message
              : m.settings_email_unknown_error(),
        });
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="notify-email">
      <div className="notify-form">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-medium fuwari-text-90">
              {m.settings_tab_email()}
            </h2>
            <p className="settings-muted">{m.settings_design_email_hint()}</p>
          </div>
          <span
            role="status"
            className={cn(
              "shrink-0 h-6 px-2 rounded-full text-xs grid place-items-center",
              connectionStatus === "verified"
                ? "bg-(--fuwari-success-bg) text-(--fuwari-success-fg)"
                : connectionStatus === "failed"
                  ? "bg-(--fuwari-danger-bg) text-(--fuwari-danger-fg)"
                  : "bg-(--fuwari-btn-regular-bg) fuwari-text-50",
            )}
          >
            {connectionLabels[connectionStatus]}
          </span>
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

        <h3 className="settings-group-title">{m.settings_email_account()}</h3>
        <div className="settings-field-grid">
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
            <SecretControl
              kind="email"
              stored={secrets.emailPasswordConfigured}
              label={m.settings_email_creds_password_label()}
            />
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
        <p className="settings-muted notify-test-hint">
          {m.settings_design_test_hint()}
        </p>
      </div>
      <aside className="notify-preview">
        <SettingsDisclosure
          defaultOpen={widePreview}
          title={m.settings_design_email_preview()}
        >
          <p className="settings-muted">{m.settings_design_preview_hint()}</p>
          <div className="notify-preview-card">
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
        </SettingsDisclosure>
      </aside>
    </section>
  );
}

function emailTestInput(
  email: SystemConfig["email"],
  expectedRevision: number,
): AdminTestEmailConnectionInput {
  return {
    host: email?.host?.trim() || "",
    port: email?.port || 465,
    username: email?.username || "",
    password: email?.password
      ? { action: "replace", value: email.password }
      : { action: "keep", expectedRevision },
    senderAddress: email?.senderAddress?.trim() || "",
    senderName: email?.senderName,
  };
}

function sameEmailInput(
  left: AdminTestEmailConnectionInput,
  right: AdminTestEmailConnectionInput,
) {
  return (
    left.host === right.host &&
    left.port === right.port &&
    left.username === right.username &&
    JSON.stringify(left.password) === JSON.stringify(right.password) &&
    left.senderAddress === right.senderAddress &&
    left.senderName === right.senderName
  );
}

function WebhookChannel() {
  const { register, watch, getValues, formState } =
    useFormContext<ConfigFormValues>();
  const { testWebhook, isTesting } = useWebhookConnection();
  const { secrets, revisions } = useConfigEditing();
  const clearSecret = watch("clearWebhookSecret");
  const url = watch("notification.webhook.url") ?? "";
  const secret = watch("notification.webhook.secret") ?? "";
  const canTest = Boolean(
    url.trim() && !clearSecret && (secret || secrets.webhookSecretConfigured),
  );
  const fieldError = formState.errors.notification?.webhook;

  const handleTest = async () => {
    const endpoint = getValues("notification.webhook");
    if (!endpoint?.url.trim() || !canTest) return;
    try {
      await testWebhook({
        url: endpoint.url.trim(),
        secret: endpoint.secret
          ? { action: "replace", value: endpoint.secret }
          : { action: "keep", expectedRevision: revisions.notifications },
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
    <SettingsDisclosure
      className="notify-webhook"
      title={
        <>
          {m.settings_webhook_endpoint_title()}
          <span className="settings-muted">
            {url || m.settings_connection_unconfigured()}
          </span>
        </>
      }
    >
      <div className="notify-webhook-content">
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
          <SecretControl
            kind="webhook"
            stored={secrets.webhookSecretConfigured}
            label={m.settings_webhook_endpoint_field_secret()}
          />
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
          <p className="text-xs fuwari-text-50">
            {m.settings_webhook_sample()}
          </p>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 w-2 h-2 rounded-full bg-(--fuwari-success) shrink-0" />
            <MessageCircle
              size={16}
              className="fuwari-text-50 shrink-0 mt-0.5"
            />
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
      </div>
    </SettingsDisclosure>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const nodes = Children.toArray(children);
  const hasInput = nodes.some(
    (child) => isValidElement(child) && child.type === "input",
  );
  return (
    <div className="settings-field">
      {hasInput ? <label htmlFor={id}>{label}</label> : <span>{label}</span>}
      {nodes.map((child) =>
        isValidElement<{ id?: string }>(child) && child.type === "input"
          ? cloneElement(child, { id })
          : child,
      )}
    </div>
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
      className="notify-switch"
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
