import { z } from "zod";
import { POST_STATUSES } from "@/lib/db/schema";

export const McpTagSchema = z.object({
  createdAt: z.iso.datetime().describe("Tag creation time."),
  id: z.number().describe("Numeric tag ID."),
  name: z.string().describe("Tag name."),
});

export const McpPostsListInputSchema = z.object({
  offset: z.number().optional().describe("Result offset."),
  limit: z.number().optional().describe("Maximum number of posts to return."),
  status: z.enum(POST_STATUSES).optional().describe("Filter by post status."),
  publicOnly: z
    .boolean()
    .optional()
    .describe("Only include publicly visible posts."),
  search: z.string().optional().describe("Filter by title or summary text."),
  sortDir: z.enum(["ASC", "DESC"]).optional().describe("Sort direction."),
  sortBy: z
    .enum(["publishedAt", "updatedAt"])
    .optional()
    .describe("Field used for sorting."),
});

export const McpPostSummarySchema = z.object({
  createdAt: z.iso.datetime().describe("Post creation time."),
  id: z.number().describe("Numeric post ID."),
  publishedAt: z.iso.datetime().nullable().describe("Publish time, if any."),
  readTimeInMinutes: z.number().describe("Estimated reading time in minutes."),
  slug: z.string().describe("Post slug."),
  status: z.enum(POST_STATUSES).describe("Post status."),
  summary: z.string().nullable().describe("Post summary."),
  title: z.string().describe("Post title."),
  updatedAt: z.iso.datetime().describe("Last update time."),
});

export const McpPostListItemSchema = McpPostSummarySchema.extend({
  tags: z.array(McpTagSchema).optional().describe("Assigned tags."),
});

export const McpPostsListOutputSchema = z.object({
  items: z.array(McpPostListItemSchema).describe("Matching posts."),
});

export const McpPostByIdInputSchema = z.object({
  id: z.number().describe("Numeric post ID."),
});

export const McpPostDetailSchema = McpPostSummarySchema.extend({
  contentMarkdown: z.string().describe("Post body as markdown."),
  hasPublicCache: z.boolean().describe("Whether a public snapshot exists."),
  isSynced: z.boolean().describe("Whether the public snapshot is up to date."),
  tags: z.array(McpTagSchema).optional().describe("Assigned tags."),
});

export const McpPostCreateDraftOutputSchema = z.object({
  id: z.number().describe("Numeric ID of the created draft."),
});

export const McpPostDeleteOutputSchema = z.object({
  deleted: z.literal(true).describe("Whether the post was deleted."),
  id: z.number().describe("Numeric post ID."),
  slug: z.string().describe("Slug of the deleted post."),
  status: z.enum(POST_STATUSES).describe("Post status before deletion."),
  title: z.string().describe("Title of the deleted post."),
});

export const McpPostUpdateInputSchema = z
  .object({
    id: z.number().describe("Numeric post ID to update."),
    title: z.string().optional().describe("Post title."),
    summary: z.string().nullable().optional().describe("Post summary."),
    slug: z.string().optional().describe("Post slug."),
    status: z
      .enum(POST_STATUSES)
      .optional()
      .describe("Post status. This only updates the draft/published flag."),
    publishedAt: z.iso
      .datetime()
      .nullable()
      .optional()
      .describe("Publish timestamp as ISO-8601, or null to clear it."),
    readTimeInMinutes: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Estimated reading time in minutes."),
    contentMarkdown: z
      .string()
      .optional()
      .describe(
        "Full post body as markdown. Converted to editor JSON internally.",
      ),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.summary !== undefined ||
      value.slug !== undefined ||
      value.status !== undefined ||
      value.publishedAt !== undefined ||
      value.readTimeInMinutes !== undefined ||
      value.contentMarkdown !== undefined,
    {
      message: "At least one field must be provided.",
    },
  );

export const McpPostSetVisibilityInputSchema = z.object({
  id: z.number().describe("Numeric post ID."),
  visibility: z
    .enum(POST_STATUSES)
    .describe(
      "Target visibility. Use 'published' to publish or 'draft' to unpublish.",
    ),
  publishedAt: z.iso
    .datetime()
    .nullable()
    .optional()
    .describe(
      "Optional publish timestamp to save before queuing the publish workflow. Use null to clear it.",
    ),
  clientToday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe(
      "Current local date in YYYY-MM-DD. Optional; defaults to the server date.",
    ),
});

export const McpPostSetVisibilityOutputSchema = z.object({
  id: z.number().describe("Numeric post ID."),
  operation: z
    .enum(["publish", "unpublish"])
    .describe("The visibility action that was queued."),
  publishedAt: z.iso
    .datetime()
    .nullable()
    .describe("Current publish timestamp after queuing the workflow."),
  status: z.enum(POST_STATUSES).describe("Current stored post status."),
  workflowQueued: z
    .literal(true)
    .describe("Whether the publish workflow was queued."),
});
