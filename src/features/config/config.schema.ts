import { z } from "zod";
import { notificationEventTypeSchema } from "@/features/notification/notification.schema";

const webhookEndpointSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  url: z.url(),
  enabled: z.boolean(),
  secret: z.string().min(1),
  events: z.array(notificationEventTypeSchema),
});

export const SystemConfigSchema = z.object({
  email: z
    .object({
      apiKey: z.string().optional(),
      senderName: z.string().optional(),
      senderAddress: z.union([z.email(), z.literal("")]).optional(),
    })
    .optional(),
  notification: z
    .object({
      webhooks: z.array(webhookEndpointSchema).optional(),
    })
    .optional(),
});

export type SystemConfig = z.infer<typeof SystemConfigSchema>;

export const DEFAULT_CONFIG: SystemConfig = {
  email: {
    apiKey: "",
    senderName: "",
    senderAddress: "",
  },
  notification: {
    webhooks: [],
  },
};

export const CONFIG_CACHE_KEYS = {
  system: ["system"] as const,
} as const;
