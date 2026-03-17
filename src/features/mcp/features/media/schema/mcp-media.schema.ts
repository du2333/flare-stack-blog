import { z } from "zod";
import { POST_STATUSES } from "@/lib/db/schema";

export const McpMediaListInputSchema = z.object({
  cursor: z.number().int().positive().optional().describe("Pagination cursor."),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Maximum number of media items to return."),
  search: z.string().optional().describe("Filter by stored file name."),
  unusedOnly: z
    .boolean()
    .optional()
    .describe("Only include media not referenced by any post."),
});

export const McpMediaItemSchema = z.object({
  id: z.number().describe("Numeric media ID."),
  key: z.string().describe("Stable media storage key."),
  url: z.string().describe("Original media URL."),
  fileName: z.string().describe("Stored file name."),
  mimeType: z.string().describe("Media MIME type."),
  sizeInBytes: z.number().describe("File size in bytes."),
  width: z.number().nullable().describe("Image width, if known."),
  height: z.number().nullable().describe("Image height, if known."),
  createdAt: z.iso.datetime().describe("Upload time."),
  inUse: z.boolean().describe("Whether any post references this media."),
});

export const McpMediaListOutputSchema = z.object({
  items: z.array(McpMediaItemSchema).describe("Matching media items."),
  nextCursor: z
    .number()
    .nullable()
    .describe("Cursor for the next page, if any."),
});

export const McpMediaByKeyInputSchema = z.object({
  key: z.string().min(1).describe("Stable media storage key."),
});

export const McpMediaUsagePostSchema = z.object({
  id: z.number().describe("Numeric post ID."),
  title: z.string().describe("Post title."),
  slug: z.string().describe("Post slug."),
  summary: z.string().nullable().describe("Post summary."),
  status: z.enum(POST_STATUSES).describe("Post status."),
  readTimeInMinutes: z.number().describe("Estimated reading time."),
});

export const McpMediaUsageOutputSchema = z.object({
  key: z.string().describe("Stable media storage key."),
  inUse: z.boolean().describe("Whether any post references this media."),
  posts: z
    .array(McpMediaUsagePostSchema)
    .describe("Posts that reference this media."),
});

export const McpMediaDeleteOutputSchema = z.object({
  deleted: z.literal(true).describe("Whether the media item was deleted."),
  key: z.string().describe("Stable media storage key."),
});
