import { z } from "zod";
import { SystemConfigSchema } from "./config.schema";
import { SiteConfigInputSchema } from "./site-config.schema";
import {
  WEBHOOK_TEMPLATE_MAX_LENGTH,
  webhookProviderSchema,
} from "@/features/webhook/webhook.schema";

const ConfigRevisionSchema = z
  .number()
  .int()
  .nonnegative()
  .describe(
    "Modification revision of the selected section, read from GET /admin/config. Site and notification revisions are independent; stale writes/tests fail with CONFIG_CONFLICT (409).",
  );
const SecretChangeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("keep") }).strict(),
  z.object({ action: z.literal("replace"), value: z.string().min(1) }).strict(),
  z.object({ action: z.literal("clear") }).strict(),
]);
const DeliveryEmailSchema = z
  .object({
    host: z.string().trim(),
    port: z.number().int().min(1).max(65535),
    username: z.string().trim(),
    senderName: z.string(),
    senderAddress: z.union([z.email(), z.literal("")]),
  })
  .strict();
const DeliveryNotificationSchema = z
  .object({
    admin: z
      .object({ channels: z.object({ email: z.boolean() }).strict() })
      .strict(),
    user: z.object({ emailEnabled: z.boolean() }).strict(),
    webhook: z
      .object({
        provider: webhookProviderSchema
          .optional()
          .describe(
            "Push channel: generic (signed Flare JSON), telegram, discord, feishu, dingtalk, wecom, bark, ntfy or custom (body template). Omitted keeps the saved channel.",
          ),
        url: z
          .union([z.url(), z.literal("")])
          .describe(
            "Endpoint or bot Webhook URL; Bark's push URL; ntfy's topic URL. Unused for telegram.",
          ),
        chatId: z
          .string()
          .trim()
          .max(100)
          .optional()
          .describe("Telegram chat to message. Omitted keeps the saved one."),
        template: z
          .string()
          .max(WEBHOOK_TEMPLATE_MAX_LENGTH)
          .optional()
          .describe(
            "custom only: request body with {{title}}, {{message}}, {{url}}, {{type}}, {{timestamp}} and {{data.<field>}} placeholders, JSON-escaped when the body is JSON. Omitted keeps the saved one.",
          ),
      })
      .strict(),
  })
  .strict();
export const UpdateConfigSectionSchema = z.discriminatedUnion("section", [
  z
    .object({
      section: z.literal("site"),
      expectedRevision: ConfigRevisionSchema,
      site: SiteConfigInputSchema.describe(
        "The whole Site Config. It replaces the saved one: omitted fields, including theme.id, return to their defaults.",
      ),
    })
    .strict(),
  z
    .object({
      section: z.literal("notifications"),
      expectedRevision: ConfigRevisionSchema,
      email: DeliveryEmailSchema,
      notification: DeliveryNotificationSchema,
      secrets: z
        .object({
          emailPassword: SecretChangeSchema.describe(
            "keep retains the saved password; replace stores value; clear removes it. Supplying a password requires host, username and senderAddress.",
          ),
          webhookSecret: SecretChangeSchema.describe(
            "The generic or custom signing key, or the Telegram bot token. keep retains the saved secret while the channel stays the same; replace stores value; clear removes it. generic needs a secret alongside its URL, telegram its bot token; other channels discard it.",
          ),
        })
        .strict(),
    })
    .strict(),
]);
export const AdminConfigSnapshotSchema = z.object({
  config: SystemConfigSchema.describe(
    "Resolved settings. Existing email passwords and Webhook secrets are empty strings, and legacy email.apiKey is omitted. Use secrets flags for configuration status; empty response fields do not request credential removal.",
  ),
  revisions: z.object({
    site: ConfigRevisionSchema,
    notifications: ConfigRevisionSchema,
  }),
  secrets: z.object({
    emailPasswordConfigured: z.boolean(),
    webhookSecretConfigured: z.boolean(),
  }),
  schemaVersion: z
    .literal(1)
    .describe(
      "Storage format version, distinct from per-section modification revisions.",
    ),
});
export const SavedSecretInputSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("keep"),
      expectedRevision: ConfigRevisionSchema,
    })
    .strict(),
  z.object({ action: z.literal("replace"), value: z.string().min(1) }).strict(),
]);
export type UpdateConfigSection = z.infer<typeof UpdateConfigSectionSchema>;
export type AdminConfigSnapshot = z.infer<typeof AdminConfigSnapshotSchema>;
export type SecretChange = z.infer<typeof SecretChangeSchema>;
export type SavedSecretInput = z.infer<typeof SavedSecretInputSchema>;
export const CONFIG_ERRORS = {
  CONFIG_CONFLICT: {
    status: 409,
    message:
      "This configuration section changed. Reload it before saving or testing.",
  },
  CONFIG_INVALID: {
    status: 400,
    message: "The configuration is incomplete or invalid.",
  },
  CONFIG_VERSION_UNSUPPORTED: {
    status: 409,
    message:
      "This configuration was written by a newer version. Upgrade before editing it.",
  },
} as const;
