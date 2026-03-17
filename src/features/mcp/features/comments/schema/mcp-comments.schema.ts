import { z } from "zod";
import { COMMENT_STATUSES } from "@/lib/db/schema";

const MCP_COMMENT_MUTABLE_STATUSES = [
  "published",
  "pending",
  "deleted",
] as const;

export const McpCommentsListInputSchema = z.object({
  offset: z.number().int().min(0).optional().describe("Result offset."),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Maximum number of comments to return."),
  status: z
    .enum(COMMENT_STATUSES)
    .optional()
    .describe("Filter by moderation status."),
  postId: z.number().optional().describe("Only include comments for one post."),
  userName: z.string().optional().describe("Filter by author display name."),
});

export const McpCommentSchema = z.object({
  id: z.number().describe("Numeric comment ID."),
  status: z.enum(COMMENT_STATUSES).describe("Current moderation status."),
  contentText: z.string().describe("Comment body as plain text."),
  aiReason: z.string().nullable().describe("Moderation reason, if present."),
  createdAt: z.iso.datetime().describe("Comment creation time."),
  updatedAt: z.iso.datetime().describe("Last update time."),
  postId: z.number().describe("Related post ID."),
  postTitle: z
    .string()
    .nullable()
    .describe("Related post title, if available."),
  postSlug: z.string().nullable().describe("Related post slug, if available."),
  authorId: z.string().nullable().describe("Comment author user ID."),
  authorName: z.string().nullable().describe("Comment author display name."),
  authorRole: z.string().nullable().describe("Comment author role."),
  rootId: z
    .number()
    .nullable()
    .describe("Root comment ID when this item is a reply."),
  replyToCommentId: z
    .number()
    .nullable()
    .describe("Direct parent comment ID when this item is a reply."),
  replyToUserName: z
    .string()
    .nullable()
    .describe("Display name of the parent comment author."),
  rootCommentText: z
    .string()
    .nullable()
    .describe("Root comment text for reply context."),
  replyToCommentText: z
    .string()
    .nullable()
    .describe("Direct parent comment text for reply context."),
});

export const McpCommentsListOutputSchema = z.object({
  items: z.array(McpCommentSchema).describe("Matching comments."),
  total: z.number().describe("Total matching comments."),
});

export const McpCommentByIdInputSchema = z.object({
  id: z.number().describe("Numeric comment ID."),
});

export const McpCommentStatusUpdateInputSchema = z.object({
  id: z.number().describe("Numeric comment ID."),
  status: z
    .enum(MCP_COMMENT_MUTABLE_STATUSES)
    .describe("Target moderation status."),
});

export const McpCommentStatusUpdateOutputSchema = z.object({
  id: z.number().describe("Numeric comment ID."),
  previousStatus: z
    .enum(COMMENT_STATUSES)
    .describe("Status before the update."),
  status: z.enum(COMMENT_STATUSES).describe("Current comment status."),
  postId: z.number().describe("Related post ID."),
});

export const McpCommentDeleteOutputSchema = z.object({
  deleted: z.literal(true).describe("Whether the comment was deleted."),
  id: z.number().describe("Numeric comment ID."),
  previousStatus: z.enum(COMMENT_STATUSES).describe("Status before deletion."),
  postId: z.number().describe("Related post ID."),
});
