import { z } from "zod";

export const McpSearchPostsInputSchema = z.object({
  q: z.string().min(1),
  limit: z.number().int().positive().max(25).optional(),
});

export const McpSearchPostSchema = z.object({
  id: z.string(),
  slug: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
  title: z.string(),
});

export const McpSearchMatchSchema = z.object({
  contentSnippet: z.string(),
  summary: z.string(),
  title: z.string(),
});

export const McpSearchResultItemSchema = z.object({
  matches: McpSearchMatchSchema,
  post: McpSearchPostSchema,
  score: z.number(),
});

export const McpSearchPostsOutputSchema = z.object({
  items: z.array(McpSearchResultItemSchema),
});
