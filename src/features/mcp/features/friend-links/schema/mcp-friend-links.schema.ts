import { z } from "zod";
import { FRIEND_LINK_STATUSES } from "@/lib/db/schema";

export const McpFriendLinkSchema = z.object({
  id: z.number().describe("Numeric friend link ID."),
  siteName: z.string().describe("Display name of the linked site."),
  siteUrl: z.string().describe("Canonical site URL."),
  description: z
    .string()
    .nullable()
    .describe("Short site description, if present."),
  logoUrl: z.string().nullable().describe("Logo image URL, if present."),
  contactEmail: z
    .string()
    .nullable()
    .describe("Contact email address, if present."),
  status: z.enum(FRIEND_LINK_STATUSES).describe("Current moderation status."),
  rejectionReason: z.string().nullable().describe("Rejection reason, if any."),
  userId: z.string().nullable().describe("Submitter user ID, if present."),
  userName: z
    .string()
    .nullable()
    .describe("Submitter display name, if present."),
  createdAt: z.iso.datetime().describe("Creation time."),
  updatedAt: z.iso.datetime().describe("Last update time."),
});

export const McpFriendLinksListInputSchema = z.object({
  offset: z.number().int().min(0).optional().describe("Result offset."),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Maximum number of friend links to return."),
  status: z
    .enum(FRIEND_LINK_STATUSES)
    .optional()
    .describe("Filter by moderation status."),
});

export const McpFriendLinksListOutputSchema = z.object({
  items: z.array(McpFriendLinkSchema).describe("Matching friend links."),
  total: z.number().describe("Total matching friend links."),
});

export const McpFriendLinkCreateInputSchema = z.object({
  siteName: z
    .string()
    .min(1)
    .max(100)
    .describe("Display name of the linked site."),
  siteUrl: z.string().url().describe("Canonical site URL."),
  description: z
    .string()
    .max(300)
    .optional()
    .describe("Short site description."),
  logoUrl: z
    .union([z.literal(""), z.string().url()])
    .optional()
    .describe("Logo image URL."),
  contactEmail: z
    .union([z.literal(""), z.string().email()])
    .optional()
    .describe("Contact email address."),
});

export const McpFriendLinkUpdateInputSchema = z
  .object({
    id: z.number().describe("Numeric friend link ID."),
    siteName: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .describe("Updated site display name."),
    siteUrl: z.string().url().optional().describe("Updated site URL."),
    description: z
      .string()
      .max(300)
      .optional()
      .describe("Updated site description."),
    logoUrl: z
      .union([z.literal(""), z.string().url()])
      .optional()
      .describe("Updated logo image URL."),
    contactEmail: z
      .union([z.literal(""), z.string().email()])
      .optional()
      .describe("Updated contact email address."),
    status: z
      .enum(["approved", "rejected"])
      .optional()
      .describe("Optional moderation status update."),
    rejectionReason: z
      .string()
      .max(500)
      .optional()
      .describe("Optional rejection reason when rejecting a submission."),
  })
  .refine(
    (value) =>
      value.siteName !== undefined ||
      value.siteUrl !== undefined ||
      value.description !== undefined ||
      value.logoUrl !== undefined ||
      value.contactEmail !== undefined ||
      value.status !== undefined ||
      value.rejectionReason !== undefined,
    {
      message: "At least one field must be provided.",
    },
  );

export const McpFriendLinkByIdInputSchema = z.object({
  id: z.number().describe("Numeric friend link ID."),
});

export const McpFriendLinkDeleteOutputSchema = z.object({
  deleted: z.literal(true).describe("Whether the friend link was deleted."),
  id: z.number().describe("Numeric friend link ID."),
});
