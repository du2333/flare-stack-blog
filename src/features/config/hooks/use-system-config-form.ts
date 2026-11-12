import { useEffect, useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createSiteConfigInputFormSchema } from "../site-config.schema";
import { DEFAULT_CONFIG } from "../config.schema";
import {
  UpdateConfigSectionSchema,
  type AdminConfigSnapshot,
  type SecretChange,
} from "../config.admin.schema";
import type { ConfigFormValues } from "../components/admin/config-editing";
import {
  countChangedNotificationSettings,
  countChangedSettings,
} from "../components/admin/save-bar";
import type { SettingsPageId } from "../components/admin/settings-pages";
import {
  ownsDirtySiteField,
  ownsSiteField,
  PERSONALIZE_PAGE,
  siteForSave,
} from "../utils/site-field-pages";
import { useSystemSetting } from "./use-system-setting";
import type { WebhookEndpoint } from "@/features/webhook/webhook.schema";
import { m } from "@/paraglide/messages";

const emptySnapshot: AdminConfigSnapshot = {
  config: DEFAULT_CONFIG,
  revisions: { site: 0, notifications: 0 },
  secrets: { emailPasswordConfigured: false, webhookSecretConfigured: false },
  schemaVersion: 1,
};
const valuesOf = (snapshot: AdminConfigSnapshot): ConfigFormValues => ({
  ...snapshot.config,
  clearEmailPassword: false,
  clearWebhookSecret: false,
});
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const secretChange = (
  value: string | undefined,
  clear: boolean,
): SecretChange =>
  clear
    ? { action: "clear" }
    : value
      ? { action: "replace", value }
      : { action: "keep" };

function webhookInput(webhook: WebhookEndpoint | undefined) {
  const provider = webhook?.provider ?? "generic";
  return {
    provider,
    // Telegram's URL is built from the bot token.
    url: provider === "telegram" ? "" : (webhook?.url.trim() ?? ""),
    chatId: webhook?.chatId?.trim() ?? "",
    template: webhook?.template ?? "",
  };
}

/**
 * The form of a page that edits System Config: a settings page, or
 * 「个性化」, which edits the presentation fields of Site Config only.
 */
export function useSystemConfigForm(
  nav: SettingsPageId | typeof PERSONALIZE_PAGE | null = null,
) {
  const { snapshot, saveSettings, isLoading, reload } = useSystemSetting();
  const methods = useForm<ConfigFormValues>({
    defaultValues: valuesOf(emptySnapshot),
  });
  const { isDirty, dirtyFields } = methods.formState;
  const [baseline, setBaseline] = useState(emptySnapshot);
  const [isSubmitting, setSubmitting] = useState(false);
  const [conflicts, setConflicts] = useState({
    site: false,
    notifications: false,
  });
  const initialized = useRef(false);
  useEffect(() => {
    if (!snapshot || isSubmitting) return;
    if (!initialized.current || !isDirty) {
      initialized.current = true;
      setBaseline(snapshot);
      methods.reset(valuesOf(snapshot));
    }
  }, [snapshot, isDirty, isSubmitting, methods]);
  const sitePage = nav === PERSONALIZE_PAGE ? PERSONALIZE_PAGE : "site";
  const section =
    nav === "site" || nav === PERSONALIZE_PAGE ? "site" : "notifications";
  const siteDirty = ownsDirtySiteField(sitePage, dirtyFields.site);
  const sectionDirty =
    section === "site"
      ? siteDirty
      : !!(
          dirtyFields.email ||
          dirtyFields.notification ||
          dirtyFields.clearEmailPassword ||
          dirtyFields.clearWebhookSecret
        );
  // Refresh just one section while keeping the other section's draft and baseline.
  const accept = (incoming: AdminConfigSnapshot, desired: ConfigFormValues) => {
    const next =
      section === "site"
        ? {
            ...baseline,
            config: { ...baseline.config, site: incoming.config.site },
            revisions: { ...baseline.revisions, site: incoming.revisions.site },
          }
        : {
            ...baseline,
            config: {
              ...baseline.config,
              email: incoming.config.email,
              notification: incoming.config.notification,
            },
            secrets: incoming.secrets,
            revisions: {
              ...baseline.revisions,
              notifications: incoming.revisions.notifications,
            },
          };
    setBaseline(next);
    methods.reset(valuesOf(next));
    for (const field of [
      "site",
      "email",
      "notification",
      "clearEmailPassword",
      "clearWebhookSecret",
    ] as const) {
      if (!same(desired[field], valuesOf(next)[field]))
        methods.setValue(field, desired[field], { shouldDirty: true });
    }
  };
  const discardSection = async () => {
    const result = await reload();
    if (!result.data || result.isError) {
      toast.error(m.settings_toast_save_error());
      return;
    }
    const desired = methods.getValues();
    const incoming = valuesOf(result.data);
    accept(
      result.data,
      section === "site"
        ? { ...desired, site: incoming.site }
        : {
            ...desired,
            email: incoming.email,
            notification: incoming.notification,
            clearEmailPassword: false,
            clearWebhookSecret: false,
          },
    );
    setConflicts((previous) => ({ ...previous, [section]: false }));
  };
  // Takes in what was saved elsewhere and keeps what is typed in the fields
  // this page owns.
  const reloadSection = async () => {
    if (section !== "site") return;
    const result = await reload();
    if (!result.data || result.isError) {
      toast.error(m.settings_toast_save_error());
      return;
    }
    const desired = methods.getValues();
    accept(result.data, {
      ...desired,
      site: siteForSave(valuesOf(result.data).site, desired.site, sitePage),
    });
    setConflicts((previous) => ({ ...previous, site: false }));
  };
  const onSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (
      isSubmitting ||
      !sectionDirty ||
      (nav !== "site" && nav !== "notify" && nav !== PERSONALIZE_PAGE)
    )
      return;
    methods.clearErrors();
    const submitted = structuredClone(methods.getValues());
    const email = submitted.email ?? {};
    const notification = submitted.notification;
    // The Site Config as loaded, with this page's own fields from the form.
    const site = siteForSave(baseline.config.site, submitted.site, sitePage);
    const parsedSite =
      section === "site"
        ? createSiteConfigInputFormSchema(m).safeParse(site)
        : null;
    if (parsedSite && !parsedSite.success) {
      const issue = parsedSite.error.issues[0];
      methods.setError(`site.${issue.path.join(".")}` as "site.title", {
        message: issue.message,
      });
      toast.error(issue.message);
      return;
    }
    const parsed = UpdateConfigSectionSchema.safeParse(
      section === "site"
        ? {
            section,
            expectedRevision: baseline.revisions.site,
            site: parsedSite?.success ? parsedSite.data : site,
          }
        : {
            section,
            expectedRevision: baseline.revisions.notifications,
            email: {
              host: email.host ?? "",
              port: email.port ?? 465,
              username: email.username ?? "",
              senderName: email.senderName ?? "",
              senderAddress: email.senderAddress?.trim() ?? "",
            },
            notification: {
              admin: {
                channels: {
                  email: notification?.admin?.channels?.email ?? true,
                },
              },
              user: { emailEnabled: notification?.user?.emailEnabled ?? true },
              webhook: webhookInput(notification?.webhook),
            },
            secrets: {
              emailPassword: secretChange(
                email.password,
                submitted.clearEmailPassword,
              ),
              webhookSecret: secretChange(
                notification?.webhook?.secret,
                submitted.clearWebhookSecret,
              ),
            },
          },
    );
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      const saved = await saveSettings(parsed.data);
      const latest = methods.getValues();
      let desired = latest;
      if (section === "site" && same(latest.site, submitted.site))
        desired = { ...latest, site: saved.config.site };
      if (
        section === "notifications" &&
        [
          "email",
          "notification",
          "clearEmailPassword",
          "clearWebhookSecret",
        ].every((key) =>
          same(
            latest[key as keyof ConfigFormValues],
            submitted[key as keyof ConfigFormValues],
          ),
        )
      )
        desired = {
          ...latest,
          email: saved.config.email,
          notification: saved.config.notification,
          clearEmailPassword: false,
          clearWebhookSecret: false,
        };
      accept(saved, desired);
      setConflicts((previous) => ({ ...previous, [section]: false }));
      toast.success(m.settings_toast_save_success());
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error ? error.code : "";
      if (code === "CONFIG_CONFLICT") {
        setConflicts((previous) => ({ ...previous, [section]: true }));
        // The save bar says it for Site Config, with the way on. A toast
        // there would cover its buttons.
        if (section !== "site") toast.error(m.settings_config_conflict());
      } else
        toast.error(
          code === "CONFIG_INVALID"
            ? m.settings_config_incomplete()
            : m.settings_toast_save_error(),
        );
    } finally {
      setSubmitting(false);
    }
  };
  return {
    methods,
    isLoading,
    isSubmitting,
    isDirty,
    sectionDirty,
    dirtySections: {
      site: siteDirty,
      notifications: !!(
        dirtyFields.email ||
        dirtyFields.notification ||
        dirtyFields.clearEmailPassword ||
        dirtyFields.clearWebhookSecret
      ),
    },
    /** How many settings of this page changed; 「个性化」 does not count. */
    changedCount:
      nav === PERSONALIZE_PAGE
        ? undefined
        : section === "site"
          ? countChangedSettings(
              Object.fromEntries(
                Object.entries(dirtyFields.site ?? {}).filter(([field]) =>
                  ownsSiteField(sitePage, field),
                ),
              ),
            )
          : countChangedNotificationSettings(dirtyFields),
    onSubmit,
    baseline,
    conflict: conflicts[section],
    discardSection,
    reloadSection,
  };
}
