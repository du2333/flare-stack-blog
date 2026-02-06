import { z } from "zod";

export const emailMessageSchema = z.object({
  type: z.literal("EMAIL"),
  data: z.object({
    to: z.string(),
    subject: z.string(),
    html: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
  }),
});

export const queueMessageSchema = z.discriminatedUnion("type", [
  emailMessageSchema,
]);

export type QueueMessage = z.infer<typeof queueMessageSchema>;
export type EmailMessage = z.infer<typeof emailMessageSchema>;
