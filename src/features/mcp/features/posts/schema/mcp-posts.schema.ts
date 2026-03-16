import { z } from "zod";
import { POST_STATUSES } from "@/lib/db/schema";

export const McpTagSchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.number(),
  name: z.string(),
});

export const McpPostsListInputSchema = z.object({
  offset: z.number().optional(),
  limit: z.number().optional(),
  status: z.enum(POST_STATUSES).optional(),
  publicOnly: z.boolean().optional(),
  search: z.string().optional(),
  sortDir: z.enum(["ASC", "DESC"]).optional(),
  sortBy: z.enum(["publishedAt", "updatedAt"]).optional(),
});

export const McpPostSummarySchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.number(),
  publishedAt: z.iso.datetime().nullable(),
  readTimeInMinutes: z.number(),
  slug: z.string(),
  status: z.enum(POST_STATUSES),
  summary: z.string().nullable(),
  title: z.string(),
  updatedAt: z.iso.datetime(),
});

export const McpPostListItemSchema = McpPostSummarySchema.extend({
  tags: z.array(McpTagSchema).optional(),
});

export const McpPostsListOutputSchema = z.object({
  items: z.array(McpPostListItemSchema),
});

export const McpPostByIdInputSchema = z.object({
  id: z.number(),
});

export const McpPostDetailSchema = McpPostSummarySchema.extend({
  contentMarkdown: z.string(),
  hasPublicCache: z.boolean(),
  isSynced: z.boolean(),
  tags: z.array(McpTagSchema).optional(),
});

export const McpPostCreateDraftOutputSchema = z.object({
  id: z.number(),
});
