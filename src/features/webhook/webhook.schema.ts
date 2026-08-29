import { z } from "zod";

export const webhookEndpointSchema = z.object({
  url: z.string(),
  secret: z.string(),
});

export const testWebhookInputSchema = z.object({
  url: z.url(),
  secret: z.string().min(1),
});

export const legacyWebhookEndpointSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  url: z.string().optional(),
  enabled: z.boolean().optional(),
  secret: z.string().optional(),
  events: z.array(z.string()).optional(),
});

export type WebhookEndpoint = z.infer<typeof webhookEndpointSchema>;
