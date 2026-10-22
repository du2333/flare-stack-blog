import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { MOMENT_TYPES, MomentsTable } from "@/lib/db/schema";

const coercedDate = z.union([z.date(), z.string().pipe(z.coerce.date())]);
const coercedDateNullable = coercedDate.nullable();

export const MomentSelectSchema = createSelectSchema(MomentsTable, {
  publishedAt: coercedDateNullable,
  createdAt: coercedDate,
  updatedAt: coercedDate,
  deletedAt: coercedDateNullable,
});

export const MomentItemSchema = MomentSelectSchema.omit({
  deletedAt: true,
});

const imageUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(
    (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
    "INVALID_IMAGE_URL",
  );

export const CreateMomentInputSchema = z.object({
  type: z.enum(MOMENT_TYPES).default("moment"),
  content: z.string().trim().min(1).max(5000),
  images: z.array(imageUrlSchema).max(9).default([]),
  location: z.string().trim().max(100).nullish(),
  publishedAt: coercedDate.nullish(),
});

export const UpdateMomentInputSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum(MOMENT_TYPES).optional(),
  content: z.string().trim().min(1).max(5000).optional(),
  images: z.array(imageUrlSchema).max(9).optional(),
  location: z.string().trim().max(100).nullable().optional(),
  publishedAt: coercedDate.nullable().optional(),
});

export const DeleteMomentInputSchema = z.object({
  id: z.number().int().positive(),
});

export const GetMomentsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
});

export const GetAdminMomentsInputSchema = z.object({
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(100),
});

export const MomentsListResponseSchema = z.object({
  items: z.array(MomentItemSchema),
  total: z.number().int().nonnegative(),
});

export const MOMENTS_CACHE_KEYS = {
  list: (version: string, limit: number) =>
    ["moments", "list", version, limit] as const,
} as const;

export type CreateMomentInput = z.infer<typeof CreateMomentInputSchema>;
export type UpdateMomentInput = z.infer<typeof UpdateMomentInputSchema>;
export type DeleteMomentInput = z.infer<typeof DeleteMomentInputSchema>;
export type GetMomentsInput = z.infer<typeof GetMomentsInputSchema>;
export type GetAdminMomentsInput = z.infer<typeof GetAdminMomentsInputSchema>;
export type MomentItem = z.infer<typeof MomentItemSchema>;
export type MomentsListResponse = z.infer<typeof MomentsListResponseSchema>;
