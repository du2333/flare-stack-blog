import { z } from "zod";

export const McpSearchPostsInputSchema = z.object({
  q: z.string().min(1).describe("Full-text query."),
  limit: z
    .number()
    .int()
    .positive()
    .max(25)
    .optional()
    .describe("Maximum number of results to return."),
});

export const McpSearchPostSchema = z.object({
  id: z.string().describe("Post ID."),
  slug: z.string().describe("Post slug."),
  summary: z.string().describe("Post summary."),
  tags: z.array(z.string()).describe("Post tags."),
  title: z.string().describe("Post title."),
});

export const McpSearchMatchSchema = z.object({
  contentSnippet: z.string().describe("Matched body snippet."),
  summary: z.string().describe("Matched summary snippet."),
  title: z.string().describe("Matched title snippet."),
});

export const McpSearchResultItemSchema = z.object({
  matches: McpSearchMatchSchema.describe("Highlighted matches."),
  post: McpSearchPostSchema.describe("Matched post."),
  score: z.number().describe("Search relevance score."),
});

export const McpSearchPostsOutputSchema = z.object({
  items: z.array(McpSearchResultItemSchema).describe("Search results."),
});
