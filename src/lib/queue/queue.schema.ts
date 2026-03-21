import { z } from "zod";
import { notificationEventSchema } from "@/features/notification/notification.schema";
import { EMAIL_UNSUBSCRIBE_TYPES } from "@/lib/db/schema";

export const emailMessageSchema = z.object({
  type: z.literal("EMAIL"),
  data: z.object({
    to: z.string(),
    subject: z.string(),
    html: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
    idempotencyKey: z.string().optional(),
    unsubscribe: z
      .object({
        userId: z.string(),
        type: z.enum(EMAIL_UNSUBSCRIBE_TYPES),
      })
      .optional(),
  }),
});

export const webhookMessageSchema = z.object({
  type: z.literal("WEBHOOK"),
  data: z.object({
    endpointId: z.string(),
    url: z.url(),
    secret: z.string(),
    event: notificationEventSchema,
  }),
});

export const postAutoSnapshotMessageSchema = z.object({
  type: z.literal("POST_AUTO_SNAPSHOT"),
  data: z.object({
    postId: z.number().int().positive(),
    quietWindowSeconds: z.number().int().positive().optional(),
  }),
});

export const pageviewMessageSchema = z.object({
  type: z.literal("PAGEVIEW"),
  data: z.object({
    postId: z.number().int().positive(),
    visitorHash: z.string(),
  }),
});

export const queueMessageSchema = z.discriminatedUnion("type", [
  emailMessageSchema,
  webhookMessageSchema,
  postAutoSnapshotMessageSchema,
  pageviewMessageSchema,
]);

export type QueueMessage = z.infer<typeof queueMessageSchema>;
export type EmailMessage = z.infer<typeof emailMessageSchema>;
export type WebhookMessage = z.infer<typeof webhookMessageSchema>;
export type PostAutoSnapshotMessage = z.infer<
  typeof postAutoSnapshotMessageSchema
>;
export type PageviewMessage = z.infer<typeof pageviewMessageSchema>;
