import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { FriendLinksTable } from "@/lib/db/schema";

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
  siteName: z.string().min(1, "站点名称不能为空").max(100, "站点名称最长100字"),
  siteUrl: z.url("请输入有效的URL"),
  description: z.string().max(300, "描述最长300字").optional(),
  logoUrl: z.union([z.literal(""), z.url("请输入有效的Logo URL")]).optional(),
  contactEmail: z.email("请输入有效的邮箱地址"),
});

// === Admin create input (manual add) ===
export const CreateFriendLinkInputSchema = z.object({
  siteName: z.string().min(1, "站点名称不能为空").max(100, "站点名称最长100字"),
  siteUrl: z.url("请输入有效的URL"),
  description: z.string().max(300, "描述最长300字").optional(),
  logoUrl: z.union([z.literal(""), z.url("请输入有效的Logo URL")]).optional(),
  contactEmail: z
    .union([z.literal(""), z.email("请输入有效的邮箱地址")])
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
  rejectionReason: z.string().max(500, "理由最长500字").optional(),
});

export const UpdateFriendLinkInputSchema = z.object({
  id: z.number(),
  siteName: z
    .string()
    .min(1, "站点名称不能为空")
    .max(100, "站点名称最长100字")
    .optional(),
  siteUrl: z.url("请输入有效的URL").optional(),
  description: z.string().max(300, "描述最长300字").optional(),
  logoUrl: z.union([z.literal(""), z.url("请输入有效的Logo URL")]).optional(),
  contactEmail: z
    .union([z.literal(""), z.email("请输入有效的邮箱地址")])
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
