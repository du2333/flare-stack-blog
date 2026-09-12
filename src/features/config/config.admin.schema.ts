import { z } from "zod";
import { SystemConfigSchema } from "./config.schema";
import { SiteConfigInputSchema } from "./site-config.schema";

export const ConfigRevisionSchema = z
  .number()
  .int()
  .nonnegative()
  .describe(
    "Modification revision of the selected section, read from GET /admin/config. Site and notification revisions are independent; stale writes/tests fail with CONFIG_CONFLICT (409).",
  );
export const SecretChangeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("keep") }).strict(),
  z.object({ action: z.literal("replace"), value: z.string().min(1) }).strict(),
  z.object({ action: z.literal("clear") }).strict(),
]);
export const DeliveryEmailSchema = z
  .object({
    host: z.string().trim(),
    port: z.number().int().min(1).max(65535),
    username: z.string().trim(),
    senderName: z.string(),
    senderAddress: z.union([z.email(), z.literal("")]),
  })
  .strict();
export const DeliveryNotificationSchema = z
  .object({
    admin: z
      .object({ channels: z.object({ email: z.boolean() }).strict() })
      .strict(),
    user: z.object({ emailEnabled: z.boolean() }).strict(),
    webhook: z.object({ url: z.union([z.url(), z.literal("")]) }).strict(),
  })
  .strict();
export const UpdateConfigSectionSchema = z.discriminatedUnion("section", [
  z
    .object({
      section: z.literal("site"),
      expectedRevision: ConfigRevisionSchema,
      site: SiteConfigInputSchema,
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
            "keep retains the saved secret; replace stores value; clear removes it. A nonempty Webhook URL requires a secret; clear the URL before removing its secret.",
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
