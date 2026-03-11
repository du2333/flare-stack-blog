import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { FriendLinksTable } from "@/lib/db/schema";
import type { Messages } from "@/lib/i18n";

const coercedDate = z.union([z.date(), z.string().pipe(z.coerce.date())]);

export const FriendLinkSelectSchema = createSelectSchema(FriendLinksTable, {
  createdAt: coercedDate,
  updatedAt: coercedDate,
});

export const FriendLinkUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
});

export const FriendLinkWithUserSchema = FriendLinkSelectSchema.extend({
  user: FriendLinkUserSchema.nullable(),
});

// === User submission input ===

export const SubmitFriendLinkInputSchema = z.object({
  siteName: z.string().min(1).max(100),
  siteUrl: z.string().url(),
  description: z.string().max(300).optional(),
  logoUrl: z.union([z.literal(""), z.string().url()]).optional(),
  contactEmail: z.string().email(),
});

export const createSubmitFriendLinkSchema = (m: Messages) =>
  z.object({
    siteName: z
      .string()
      .min(1, m.friend_link_validation_required())
      .max(100, m.friend_link_validation_too_long({ max: 100 })),
    siteUrl: z.string().url(m.friend_link_validation_invalid_url()),
    description: z
      .string()
      .max(300, m.friend_link_validation_too_long({ max: 300 }))
      .optional(),
    logoUrl: z
      .union([
        z.literal(""),
        z.string().url(m.friend_link_validation_invalid_url()),
      ])
      .optional(),
    contactEmail: z.string().email(m.friend_link_validation_invalid_email()),
  });

// === Admin create input (manual add) ===

export const CreateFriendLinkInputSchema = z.object({
  siteName: z.string().min(1).max(100),
  siteUrl: z.string().url(),
  description: z.string().max(300).optional(),
  logoUrl: z.union([z.literal(""), z.string().url()]).optional(),
  contactEmail: z.union([z.literal(""), z.string().email()]).optional(),
});

export const createCreateFriendLinkSchema = (m: Messages) =>
  z.object({
    siteName: z
      .string()
      .min(1, m.friend_link_validation_required())
      .max(100, m.friend_link_validation_too_long({ max: 100 })),
    siteUrl: z.string().url(m.friend_link_validation_invalid_url()),
    description: z
      .string()
      .max(300, m.friend_link_validation_too_long({ max: 300 }))
      .optional(),
    logoUrl: z
      .union([
        z.literal(""),
        z.string().url(m.friend_link_validation_invalid_url()),
      ])
      .optional(),
    contactEmail: z
      .union([
        z.literal(""),
        z.string().email(m.friend_link_validation_invalid_email()),
      ])
      .optional(),
  });

// === Admin inputs ===
export const GetAllFriendLinksInputSchema = z.object({
  offset: z.number().optional(),
  limit: z.number().optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

export const ApproveFriendLinkInputSchema = z.object({
  id: z.number(),
});

export const RejectFriendLinkInputSchema = z.object({
  id: z.number(),
  rejectionReason: z.string().max(500).optional(),
});

export const createRejectFriendLinkSchema = (m: Messages) =>
  z.object({
    id: z.number(),
    rejectionReason: z
      .string()
      .max(500, m.friend_link_validation_too_long({ max: 500 }))
      .optional(),
  });

export const UpdateFriendLinkInputSchema = z.object({
  id: z.number(),
  siteName: z.string().min(1).max(100).optional(),
  siteUrl: z.string().url().optional(),
  description: z.string().max(300).optional(),
  logoUrl: z.union([z.literal(""), z.string().url()]).optional(),
  contactEmail: z.union([z.literal(""), z.string().email()]).optional(),
});

export const createUpdateFriendLinkSchema = (m: Messages) =>
  z.object({
    id: z.number(),
    siteName: z
      .string()
      .min(1, m.friend_link_validation_required())
      .max(100, m.friend_link_validation_too_long({ max: 100 }))
      .optional(),
    siteUrl: z.string().url(m.friend_link_validation_invalid_url()).optional(),
    description: z
      .string()
      .max(300, m.friend_link_validation_too_long({ max: 300 }))
      .optional(),
    logoUrl: z
      .union([
        z.literal(""),
        z.string().url(m.friend_link_validation_invalid_url()),
      ])
      .optional(),
    contactEmail: z
      .union([
        z.literal(""),
        z.string().email(m.friend_link_validation_invalid_email()),
      ])
      .optional(),
  });

export const DeleteFriendLinkInputSchema = z.object({
  id: z.number(),
});

// === Cache ===
export const ApprovedFriendLinksResponseSchema = z.array(
  FriendLinkWithUserSchema,
);

export const FRIEND_LINKS_CACHE_KEYS = {
  approvedList: (version: string) =>
    ["friend-links", "approved", version] as const,
} as const;

// === Types ===
export type SubmitFriendLinkInput = z.infer<typeof SubmitFriendLinkInputSchema>;
export type CreateFriendLinkInput = z.infer<typeof CreateFriendLinkInputSchema>;
export type GetAllFriendLinksInput = z.infer<
  typeof GetAllFriendLinksInputSchema
>;
export type ApproveFriendLinkInput = z.infer<
  typeof ApproveFriendLinkInputSchema
>;
export type RejectFriendLinkInput = z.infer<typeof RejectFriendLinkInputSchema>;
export type UpdateFriendLinkInput = z.infer<typeof UpdateFriendLinkInputSchema>;
export type DeleteFriendLinkInput = z.infer<typeof DeleteFriendLinkInputSchema>;
export type FriendLinkWithUser = z.infer<typeof FriendLinkWithUserSchema>;
