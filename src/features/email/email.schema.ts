import { z } from "zod";
import { EMAIL_PROVIDERS } from "@/features/config/config.schema";

export const TestEmailConnectionSchema = z.object({
  provider: z.enum(EMAIL_PROVIDERS).default("resend"),
  apiKey: z.string().min(1),
  senderAddress: z.email(),
  senderName: z.string().optional(),
  domain: z.string().optional(), // Mailgun 专属
  serverId: z.number().optional(), // Postmark 专属
});

export type TestEmailConnectionInput = z.infer<
  typeof TestEmailConnectionSchema
>;
