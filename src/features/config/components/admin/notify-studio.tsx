import { SettingsDisclosure } from "./settings-disclosure";
import { SecretControl } from "./secret-control";
import { SettingPart, SettingRow, SwitchRow } from "./setting-row";
import { useConfigEditing, type ConfigFormValues } from "./config-editing";
import { MessageCircle, Search, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { SystemConfig } from "@/features/config/config.schema";
import type { AdminTestEmailConnectionInput } from "@/features/email/email.schema";
import { useEmailConnection } from "@/features/email/hooks/use-email-connection";
import { emailTestStatusQuery } from "@/features/email/queries";
import type { TelegramChat } from "@/features/webhook/api/telegram";
import { useWebhookConnection } from "@/features/webhook/hooks/use-webhook-connection";
import {
  missingWebhookField,
  presetRequestTemplate,
  WEBHOOK_TEMPLATE_VARIABLES,
  webhookSecretUse,
} from "@/features/webhook/webhook.providers";
import {
  WEBHOOK_PROVIDERS,
  type WebhookEndpoint,
  type WebhookProvider,
} from "@/features/webhook/webhook.schema";
import { AdminFormRow, AdminFormSection } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  const { dirtyFields } = useFormState({ control, name: "email" });
  // The saved settings' last test applies only while the form shows them.
  const emailEdited = Boolean(dirtyFields.email) || Boolean(clearPassword);
  const savedTest = useQuery(emailTestStatusQuery());
  const refetchSavedTest = savedTest.refetch;
  // Saving changes which settings are saved, so re-read their test status.
  const [seenRevision, setSeenRevision] = useState(revisions.notifications);
  useEffect(() => {
    if (revisions.notifications === seenRevision) return;
    setSeenRevision(revisions.notifications);
    void refetchSavedTest();
  }, [revisions.notifications, seenRevision, refetchSavedTest]);
  const savedTestState = emailEdited ? "untested" : savedTest.data?.state;
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
        : savedTestState === "verified" || savedTestState === "failed"
          ? savedTestState
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
      void refetchSavedTest();
    }
  };

  const lastTest =
    !matchesTest &&
    savedTest.data?.testedAt &&
    (savedTestState === "verified" || savedTestState === "failed")
      ? savedTestState === "verified"
        ? m.settings_email_last_test_verified({
            time: formatTestedAt(savedTest.data.testedAt),
          })
        : m.settings_email_last_test_failed({
            time: formatTestedAt(savedTest.data.testedAt),
            error: savedTest.data.error ?? m.settings_email_unknown_error(),
          })
      : null;

  return (
    <AdminFormSection
      title={m.settings_tab_email()}
      description={m.settings_design_email_hint()}
      status={
        <Badge
          role="status"
          tone={
            connectionStatus === "verified"
              ? "success"
              : connectionStatus === "failed"
                ? "danger"
                : "neutral"
          }
        >
          {connectionLabels[connectionStatus]}
        </Badge>
      }
    >
      <SwitchRow label={m.settings_email_scope_admin_label()}>
        {(field) => (
          <Switch
            {...field}
            checked={adminOn}
            onCheckedChange={(checked) =>
              setValue("notification.admin.channels.email", checked, {
                shouldDirty: true,
              })
            }
          />
        )}
      </SwitchRow>
      <SwitchRow label={m.settings_email_scope_user_label()}>
        {(field) => (
          <Switch
            {...field}
            checked={userOn}
            onCheckedChange={(checked) =>
              setValue("notification.user.emailEnabled", checked, {
                shouldDirty: true,
              })
            }
          />
        )}
      </SwitchRow>

      <AdminFormRow label={m.settings_email_account()}>
        <div className="setting-parts">
          <div className="setting-parts-pair">
            <SettingPart label={m.settings_email_creds_host_label()}>
              {(field) => (
                <Input
                  {...register("email.host")}
                  {...field}
                  placeholder={m.settings_email_creds_host_ph()}
                />
              )}
            </SettingPart>
            <SettingPart label={m.settings_email_creds_port_label()}>
              {(field) => (
                <Input
                  type="number"
                  {...register("email.port", { valueAsNumber: true })}
                  {...field}
                  placeholder={m.settings_email_creds_port_ph()}
                />
              )}
            </SettingPart>
          </div>
          <SettingPart label={m.settings_email_creds_username_label()}>
            {(field) => (
              <Input
                {...register("email.username")}
                {...field}
                autoComplete="off"
                placeholder={m.settings_email_creds_username_ph()}
              />
            )}
          </SettingPart>
          <SettingPart label={m.settings_email_creds_password_label()}>
            {(field) => (
              <SecretControl
                {...field}
                kind="email"
                stored={secrets.emailPasswordConfigured}
              />
            )}
          </SettingPart>
          <SettingPart label={m.settings_email_creds_sender_name_label()}>
            {(field) => (
              <Input
                {...register("email.senderName")}
                {...field}
                placeholder={m.settings_email_creds_sender_name_ph()}
              />
            )}
          </SettingPart>
          <SettingPart label={m.settings_email_creds_sender_addr_label()}>
            {(field) => (
              <Input
                type="email"
                {...register("email.senderAddress")}
                {...field}
                placeholder={m.settings_email_creds_sender_addr_ph()}
              />
            )}
          </SettingPart>
        </div>
      </AdminFormRow>

      <AdminFormRow
        label={m.settings_connection_test_label()}
        description={m.settings_design_test_hint()}
      >
        <div className="setting-test">
          <Button
            onClick={() => void handleTest()}
            disabled={!configured}
            loading={testing}
            icon={<Send size={14} />}
          >
            {m.settings_email_test_btn_send()}
          </Button>
          {lastTest ? <p className="settings-muted">{lastTest}</p> : null}
        </div>
      </AdminFormRow>

      <SettingsDisclosure
        className="notify-preview"
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
    </AdminFormSection>
  );
}

function formatTestedAt(testedAt: string) {
  return new Date(testedAt).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

const PROVIDER_COPY: Record<
  WebhookProvider,
  {
    label: () => string;
    hint: () => string;
    urlLabel: () => string;
    urlPlaceholder: string;
  }
> = {
  generic: {
    label: m.settings_webhook_provider_generic,
    hint: m.settings_webhook_hint_generic,
    urlLabel: m.settings_webhook_endpoint_field_url,
    urlPlaceholder: "https://hooks.example.com/notify",
  },
  telegram: {
    label: () => "Telegram",
    hint: m.settings_webhook_hint_telegram,
    urlLabel: m.settings_webhook_endpoint_field_url,
    urlPlaceholder: "",
  },
  discord: {
    label: () => "Discord",
    hint: m.settings_webhook_hint_discord,
    urlLabel: m.settings_webhook_field_webhook_url,
    urlPlaceholder: "https://discord.com/api/webhooks/…",
  },
  feishu: {
    label: m.settings_webhook_provider_feishu,
    hint: m.settings_webhook_hint_feishu,
    urlLabel: m.settings_webhook_field_webhook_url,
    urlPlaceholder: "https://open.feishu.cn/open-apis/bot/v2/hook/…",
  },
  dingtalk: {
    label: m.settings_webhook_provider_dingtalk,
    hint: m.settings_webhook_hint_dingtalk,
    urlLabel: m.settings_webhook_field_webhook_url,
    urlPlaceholder: "https://oapi.dingtalk.com/robot/send?access_token=…",
  },
  wecom: {
    label: m.settings_webhook_provider_wecom,
    hint: m.settings_webhook_hint_wecom,
    urlLabel: m.settings_webhook_field_webhook_url,
    urlPlaceholder: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…",
  },
  bark: {
    label: () => "Bark",
    hint: m.settings_webhook_hint_bark,
    urlLabel: m.settings_webhook_field_bark_url,
    urlPlaceholder: "https://api.day.app/…",
  },
  ntfy: {
    label: () => "ntfy",
    hint: m.settings_webhook_hint_ntfy,
    urlLabel: m.settings_webhook_field_ntfy_url,
    urlPlaceholder: "https://ntfy.sh/…",
  },
  custom: {
    label: m.settings_webhook_provider_custom,
    hint: m.settings_webhook_hint_custom,
    urlLabel: m.settings_webhook_endpoint_field_url,
    urlPlaceholder: "https://hooks.example.com/notify",
  },
};

const WEBHOOK_DOCS_URL =
  "https://github.com/du2333/flare-stack-blog/blob/main/docs/webhook.md";

const GENERIC_STARTER =
  '{"title": "{{title}}", "message": "{{message}}", "url": "{{url}}"}';

/** Where "custom" starts: what the channel the admin leaves would send. */
function customStarter(
  from: WebhookProvider,
  webhook: WebhookEndpoint | undefined,
) {
  const url = webhook?.url?.trim() ?? "";
  if (from === "generic" || from === "custom")
    return { url, template: GENERIC_STARTER };
  return presetRequestTemplate(
    from,
    { url, chatId: webhook?.chatId },
    webhook?.secret?.trim() || "<BOT_TOKEN>",
  );
}

function chatTypeLabel(type: string) {
  return type === "private"
    ? m.settings_webhook_chat_private()
    : type === "channel"
      ? m.settings_webhook_chat_channel()
      : m.settings_webhook_chat_group();
}

function WebhookChannel() {
  const { register, getValues, setValue, control, formState } =
    useFormContext<ConfigFormValues>();
  const { testWebhook, isTesting, findTelegramChats, isFindingChats } =
    useWebhookConnection();
  const { secrets, revisions } = useConfigEditing();
  const clearSecret = useWatch({ control, name: "clearWebhookSecret" });
  const webhook = useWatch({ control, name: "notification.webhook" });
  const provider = webhook?.provider ?? "generic";
  const savedProvider =
    formState.defaultValues?.notification?.webhook?.provider ?? "generic";
  // A saved secret belongs to the channel it was saved for.
  const stored = secrets.webhookSecretConfigured && provider === savedProvider;
  const secretUse = webhookSecretUse(provider);
  const typedSecret = webhook?.secret?.trim() ?? "";
  const hasSecret = !clearSecret && Boolean(typedSecret || stored);
  const [chats, setChats] = useState<Array<TelegramChat> | null>(null);
  const copy = PROVIDER_COPY[provider];
  const canTest =
    missingWebhookField({
      provider,
      url: webhook?.url ?? "",
      secret: hasSecret ? typedSecret || "saved" : "",
      chatId: webhook?.chatId,
      template: webhook?.template,
    }) === null;
  const fieldError = formState.errors.notification?.webhook;
  const savedSecret = () =>
    typedSecret
      ? { action: "replace" as const, value: typedSecret }
      : { action: "keep" as const, expectedRevision: revisions.notifications };

  const changeProvider = (next: WebhookProvider) => {
    if (next === provider) return;
    const current = getValues("notification.webhook");
    if (next === "custom" && !current?.template?.trim()) {
      const starter = customStarter(provider, current);
      setValue("notification.webhook.url", starter.url, { shouldDirty: true });
      setValue("notification.webhook.template", starter.template, {
        shouldDirty: true,
      });
    }
    setValue("notification.webhook.provider", next, { shouldDirty: true });
    // The secret field means something else on the new channel.
    setValue("notification.webhook.secret", "", { shouldDirty: true });
    setValue("clearWebhookSecret", false, { shouldDirty: true });
    setChats(null);
  };

  const handleTest = async () => {
    if (!canTest) return;
    const endpoint = getValues("notification.webhook");
    try {
      await testWebhook({
        provider,
        url: provider === "telegram" ? "" : (endpoint?.url.trim() ?? ""),
        chatId: endpoint?.chatId?.trim() || undefined,
        template: provider === "custom" ? endpoint?.template : undefined,
        secret: hasSecret ? savedSecret() : undefined,
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

  const handleFindChats = async () => {
    if (!hasSecret) return;
    try {
      const result = await findTelegramChats({ token: savedSecret() });
      setChats(result.chats);
      if (result.chats.length === 1)
        setValue("notification.webhook.chatId", result.chats[0].id, {
          shouldDirty: true,
        });
    } catch (error) {
      toast.error(
        m.settings_webhook_toast_chats_fail({
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  };

  const summary =
    provider === "telegram" ? webhook?.chatId?.trim() : webhook?.url?.trim();

  return (
    <AdminFormSection
      collapsible
      title={m.settings_webhook_endpoint_title()}
      summary={
        summary
          ? `${copy.label()} · ${summary}`
          : m.settings_connection_unconfigured()
      }
    >
      <SettingRow
        label={m.settings_webhook_provider()}
        description={
          <>
            {copy.hint()}
            {provider === "generic" || provider === "custom" ? (
              <>
                {" "}
                <a
                  href={WEBHOOK_DOCS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-(--fuwari-primary) hover:underline"
                >
                  {m.settings_webhook_docs_link()}
                </a>
              </>
            ) : null}
          </>
        }
      >
        {(field) => (
          <Select
            id={field.id}
            value={provider}
            onChange={(next) => changeProvider(next as WebhookProvider)}
            options={WEBHOOK_PROVIDERS.map((value) => ({
              value,
              label: PROVIDER_COPY[value].label(),
            }))}
          />
        )}
      </SettingRow>

      {provider === "telegram" ? (
        <>
          <SettingRow label={m.settings_webhook_field_bot_token()}>
            {(field) => (
              <SecretControl {...field} kind="webhook" stored={stored} />
            )}
          </SettingRow>
          <SettingRow label={m.settings_webhook_field_chat_id()}>
            {(field) => (
              <>
                <Input
                  {...register("notification.webhook.chatId")}
                  {...field}
                  placeholder={m.settings_webhook_field_chat_id_ph()}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleFindChats()}
                    disabled={!hasSecret}
                    loading={isFindingChats}
                    icon={<Search size={14} />}
                  >
                    {m.settings_webhook_find_chats()}
                  </Button>
                  {chats?.map((chat) => (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() =>
                        setValue("notification.webhook.chatId", chat.id, {
                          shouldDirty: true,
                        })
                      }
                      className={cn(
                        "rounded-xl h-8 px-3 text-sm border border-(--admin-rule) fuwari-text-75 hover:bg-(--fuwari-btn-regular-bg)",
                        webhook?.chatId === chat.id &&
                          "border-(--fuwari-primary) fuwari-text-90",
                      )}
                    >
                      {chat.name}
                      <span className="ml-1.5 text-xs fuwari-text-50">
                        {chatTypeLabel(chat.type)}
                      </span>
                    </button>
                  ))}
                </div>
                {chats?.length === 0 ? (
                  <p className="text-xs fuwari-text-50">
                    {m.settings_webhook_chats_empty()}
                  </p>
                ) : null}
              </>
            )}
          </SettingRow>
        </>
      ) : (
        <SettingRow label={copy.urlLabel()} error={fieldError?.url?.message}>
          {(field) => (
            <Input
              {...register("notification.webhook.url")}
              {...field}
              placeholder={copy.urlPlaceholder}
            />
          )}
        </SettingRow>
      )}

      {provider === "custom" ? (
        <SettingRow
          label={m.settings_webhook_field_template()}
          description={
            <>
              {m.settings_webhook_template_variables()}
              {": "}
              {WEBHOOK_TEMPLATE_VARIABLES.map((name) => (
                <code key={name} className="mx-1 font-mono">
                  {`{{${name}}}`}
                </code>
              ))}
            </>
          }
        >
          {(field) => (
            <Textarea
              {...register("notification.webhook.template")}
              {...field}
              mono
              rows={6}
              spellCheck={false}
            />
          )}
        </SettingRow>
      ) : null}

      {provider === "generic" || provider === "custom" ? (
        <SettingRow
          label={
            secretUse === "optional"
              ? m.settings_webhook_field_secret_optional()
              : m.settings_webhook_endpoint_field_secret()
          }
        >
          {(field) => (
            <SecretControl
              {...field}
              kind="webhook"
              stored={stored}
              canGenerate
            />
          )}
        </SettingRow>
      ) : null}

      <AdminFormRow
        label={m.settings_connection_test_label()}
        description={m.settings_webhook_test_hint()}
      >
        <Button
          onClick={() => void handleTest()}
          disabled={!canTest}
          loading={isTesting}
          icon={<Send size={14} />}
        >
          {m.settings_webhook_endpoint_btn_test()}
        </Button>
      </AdminFormRow>

      <AdminFormRow label={m.settings_webhook_sample()}>
        <div className="fuwari-card-base p-4">
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
      </AdminFormRow>
    </AdminFormSection>
  );
}
