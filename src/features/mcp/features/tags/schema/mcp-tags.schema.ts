import { z } from "zod";

export const McpTagSchema = z.object({
  createdAt: z.iso.datetime().describe("Tag creation time."),
  id: z.number().describe("Numeric tag ID."),
  name: z.string().describe("Tag name."),
});

export const McpTagWithCountSchema = McpTagSchema.extend({
  postCount: z.number().describe("How many posts use this tag."),
});

export const McpTagsListInputSchema = z.object({
  sortBy: z
    .enum(["name", "createdAt", "postCount"])
    .optional()
    .describe("Field used for sorting."),
  sortDir: z.enum(["asc", "desc"]).optional().describe("Sort direction."),
  withCount: z
    .boolean()
    .optional()
    .describe("Include post usage counts for each tag."),
  publicOnly: z
    .boolean()
    .optional()
    .describe("Only include tags attached to published posts."),
});

export const McpTagsListOutputSchema = z.object({
  items: z
    .array(z.union([McpTagSchema, McpTagWithCountSchema]))
    .describe("Matching tags."),
});

export const McpTagCreateInputSchema = z.object({
  name: z.string().min(1).max(50).describe("New tag name."),
});

export const McpTagUpdateInputSchema = z.object({
  id: z.number().describe("Numeric tag ID."),
  name: z.string().min(1).max(50).describe("New tag name."),
});

export const McpTagDeleteInputSchema = z.object({
  id: z.number().describe("Numeric tag ID."),
});

export const McpTagDeleteOutputSchema = z.object({
  deleted: z.literal(true).describe("Whether the tag was deleted."),
  id: z.number().describe("Numeric tag ID."),
});

export const McpPostSetTagsInputSchema = z.object({
  postId: z.number().describe("Numeric post ID."),
  tagNames: z
    .array(z.string().min(1).max(50))
    .describe(
      "Complete list of tag names to assign. Missing tags are created automatically.",
    ),
});

export const McpPostSetTagsOutputSchema = z.object({
  postId: z.number().describe("Numeric post ID."),
  tags: z.array(McpTagSchema).describe("Current tags after replacement."),
});
