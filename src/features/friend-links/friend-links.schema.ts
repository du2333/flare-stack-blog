import { z } from "zod";
import type { FriendLinksTable } from "@/lib/db/schema";
import { FRIEND_LINK_STATUSES } from "@/lib/enum-values";
import { PageOffsetSchema, pageLimitSchema } from "@/lib/orpc/pagination";
import { coercedDate } from "@/lib/orpc/dates";
import { PathIdSchema } from "@/lib/orpc/path-ids";
import type { Equal, Expect } from "@/lib/type-equal";
import { m } from "@/paraglide/messages";

const FriendLinkUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
});

/** A friend link row alone, as the admin write operations return it. */
export const FriendLinkSchema = z.object({
  id: z.int(),
  siteName: z.string(),
  siteUrl: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  status: z.enum(FRIEND_LINK_STATUSES),
  rejectionReason: z.string().nullable(),
  userId: z.string().nullable(),
  createdAt: coercedDate,
  updatedAt: coercedDate,
});

/**
 * Fails to compile when a column of `friend_links` is missing from the schema
 * or reads differently.
 */
export type FriendLinkMatchesTable = Expect<
  Equal<z.output<typeof FriendLinkSchema>, typeof FriendLinksTable.$inferSelect>
>;

const FriendLinkWithUserSchema = FriendLinkSchema.extend({
  user: FriendLinkUserSchema.nullable(),
});

const friendLinkFields = {
  siteName: z.string().min(1).max(100),
  siteUrl: z.string().url(),
  description: z.string().max(300).optional(),
  logoUrl: z.union([z.literal(""), z.string().url()]).optional(),
};

// The form schemas read their messages when a form creates them, so the errors
// are in the locale of that moment.
const createFriendLinkFormFields = () => ({
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
});

// === User submission input ===

export const SubmitFriendLinkInputSchema = z.object({
  id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Omit for a new application. Supply an owned rejected application ID to revise and resubmit it.",
    ),
  ...friendLinkFields,
});

export const createSubmitFriendLinkSchema = () =>
  z.object({
    id: z.number().int().positive().optional(),
    ...createFriendLinkFormFields(),
  });

// === Admin create input (manual add) ===

export const CreateFriendLinkInputSchema = z.strictObject(friendLinkFields);

export const createCreateFriendLinkSchema = () =>
  z.object(createFriendLinkFormFields());

// === Admin inputs ===
export const GetAllFriendLinksInputSchema = z.strictObject({
  search: z.string().max(200).optional(),
  offset: PageOffsetSchema.optional(),
  limit: pageLimitSchema(100).optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

export const ApproveFriendLinkInputSchema = z.strictObject({
  id: PathIdSchema,
});

export const RejectFriendLinkInputSchema = z.strictObject({
  id: PathIdSchema,
  rejectionReason: z.string().max(500).optional(),
});

/**
 * Strict on purpose. Approval state and ownership are not editable here, and a
 * plain object would silently strip them: a client that PATCHed
 * `{ status: "approved" }` got a 200 back and an application still pending.
 * Use POST /admin/friend-links/{id}/approve and /reject instead.
 */
export const UpdateFriendLinkInputSchema = z
  .object({
    id: PathIdSchema,
    siteName: friendLinkFields.siteName.optional(),
    siteUrl: friendLinkFields.siteUrl.optional(),
    description: friendLinkFields.description,
    logoUrl: friendLinkFields.logoUrl,
  })
  .strict();

export const DeleteFriendLinkInputSchema = z.strictObject({
  id: PathIdSchema,
});

// === Cache ===
export const ApprovedFriendLinksResponseSchema = z.array(
  FriendLinkWithUserSchema,
);

const FriendLinkStatusCountsSchema = z.object({
  pending: z.number().int().nonnegative(),
  approved: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
});

export const AdminFriendLinkListResponseSchema = z.object({
  items: z.array(FriendLinkWithUserSchema),
  total: z.number().int().nonnegative(),
  counts: FriendLinkStatusCountsSchema,
});

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
export type FriendLinkStatusCounts = z.infer<
  typeof FriendLinkStatusCountsSchema
>;
