import { z } from "zod";
import { blogConfig } from "@/blog.config";
import {
  createSiteConfigInputFormSchema,
  type SiteConfigInput,
  SiteConfigInputSchema,
} from "@/features/config/site-config.schema";
import { webhookEndpointSchema } from "@/features/webhook/webhook.schema";
import type { Messages } from "@/lib/i18n";

export const EMAIL_PROVIDERS = [
  "resend",
  "postmark",
  "mailgun",
  "sendgrid",
  "mandrill",
] as const;
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];

const emailProviderConfigSchema = z.object({
  apiKey: z.string().optional(),
});

const emailPostmarkConfigSchema = z.object({
  apiKey: z.string().optional(),
  serverId: z.number().optional(),
});

const emailMailgunConfigSchema = z.object({
  apiKey: z.string().optional(),
  domain: z.string().optional(),
});

const emailSendgridConfigSchema = z.object({
  apiKey: z.string().optional(),
});

const emailMandrillConfigSchema = z.object({
  apiKey: z.string().optional(),
});

export const SystemConfigSchema = z.object({
  email: z
    .object({
      provider: z
        .enum(EMAIL_PROVIDERS)
        .default("resend")
        .optional(),
      senderName: z.string().optional(),
      senderAddress: z.union([z.email(), z.literal("")]).optional(),
      resend: emailProviderConfigSchema.optional(),
      postmark: emailPostmarkConfigSchema.optional(),
      mailgun: emailMailgunConfigSchema.optional(),
      sendgrid: emailSendgridConfigSchema.optional(),
      mandrill: emailMandrillConfigSchema.optional(),
    })
    .optional(),
  notification: z
    .object({
      admin: z
        .object({
          channels: z
            .object({
              email: z.boolean().optional(),
              webhook: z.boolean().optional(),
            })
            .optional(),
        })
        .optional(),
      user: z
        .object({
          emailEnabled: z.boolean().optional(),
        })
        .optional(),
      webhooks: z.array(webhookEndpointSchema).optional(),
    })
    .optional(),
  site: SiteConfigInputSchema.optional(),
});

export const createSystemConfigFormSchema = (messages: Messages) =>
  z.object({
    email: SystemConfigSchema.shape.email,
    notification: SystemConfigSchema.shape.notification,
    site: createSiteConfigInputFormSchema(messages).optional(),
  });

export type SystemConfig = z.infer<typeof SystemConfigSchema>;
export type {
  SiteConfig,
  SiteConfigInput,
} from "@/features/config/site-config.schema";

export const DEFAULT_CONFIG: SystemConfig = {
  email: {
    provider: "resend",
    senderName: "",
    senderAddress: "",
    resend: { apiKey: "" },
    postmark: { apiKey: "", serverId: undefined },
    mailgun: { apiKey: "", domain: "" },
    sendgrid: { apiKey: "" },
    mandrill: { apiKey: "" },
  },
  notification: {
    admin: {
      channels: {
        email: true,
        webhook: true,
      },
    },
    user: {
      emailEnabled: true,
    },
    webhooks: [],
  },
  site: blogConfig satisfies SiteConfigInput,
};

export const CONFIG_CACHE_KEYS = {
  system: ["system"] as const,
} as const;
