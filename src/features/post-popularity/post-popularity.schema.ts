import { z } from "zod";

export const PostPopularityEntrySchema = z.object({
  postId: z.number().int().positive(),
  score: z.number().int().positive(),
});

export const PostPopularitySnapshotSchema = z.object({
  entries: z.array(PostPopularityEntrySchema),
  windowStart: z.number().int().nonnegative(),
  windowEnd: z.number().int().nonnegative(),
  syncedAt: z.number().int().nonnegative(),
});

export const PostPopularityStatusRecordSchema = z.object({
  lastAttemptAt: z.number().int().nonnegative().nullable(),
  lastSuccessAt: z.number().int().nonnegative().nullable(),
  lastError: z.string().nullable(),
  windowStart: z.number().int().nonnegative().nullable(),
  windowEnd: z.number().int().nonnegative().nullable(),
});

export const PostPopularitySyncStatusSchema = z.object({
  configured: z.boolean(),
  expired: z.boolean(),
  postCount: z.number().int().nonnegative(),
  lastAttemptAt: z.number().int().nonnegative().nullable(),
  lastSuccessAt: z.number().int().nonnegative().nullable(),
  expiresAt: z.number().int().nonnegative().nullable(),
  lastError: z.string().nullable(),
  windowStart: z.number().int().nonnegative().nullable(),
  windowEnd: z.number().int().nonnegative().nullable(),
});

export type PostPopularitySnapshot = z.infer<
  typeof PostPopularitySnapshotSchema
>;
export type PostPopularityStatusRecord = z.infer<
  typeof PostPopularityStatusRecordSchema
>;
export type PostPopularitySyncStatus = z.infer<
  typeof PostPopularitySyncStatusSchema
>;

export const POST_POPULARITY_KEYS = {
  snapshot: ["post-popularity", "snapshot"] as const,
  status: ["post-popularity", "status"] as const,
} as const;
