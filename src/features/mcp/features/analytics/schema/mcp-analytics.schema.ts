import { z } from "zod";

export const MCP_ANALYTICS_RANGES = ["24h", "7d", "30d", "90d"] as const;

export const McpAnalyticsOverviewInputSchema = z.object({
  range: z
    .enum(MCP_ANALYTICS_RANGES)
    .optional()
    .describe("Analytics time range. Defaults to 24h."),
});

export const McpAnalyticsSiteStatsSchema = z.object({
  drafts: z.number().describe("Number of draft posts."),
  mediaSize: z.number().describe("Total media storage size in bytes."),
  pendingComments: z
    .number()
    .describe("Number of comments waiting for moderation."),
  publishedPosts: z.number().describe("Number of published posts."),
});

export const McpAnalyticsMetricSchema = z.object({
  prev: z.number().describe("Previous period value."),
  value: z.number().describe("Current period value."),
});

export const McpAnalyticsTrafficPointSchema = z.object({
  date: z.iso.datetime().describe("Traffic bucket timestamp."),
  views: z.number().describe("Views in this bucket."),
});

export const McpAnalyticsTopPageSchema = z.object({
  path: z.string().describe("Top page path or post slug."),
  views: z.number().describe("Views for this page."),
});

export const McpAnalyticsActivitySchema = z.object({
  link: z.string().nullable().describe("Optional related internal link."),
  rootId: z.number().nullable().describe("Root comment ID, if applicable."),
  text: z.string().describe("Human-readable activity summary."),
  time: z.iso.datetime().nullable().describe("Activity time, if available."),
  type: z.enum(["comment", "post", "user"]).describe("Activity type."),
});

export const McpAnalyticsDataSchema = z.object({
  lastUpdated: z.iso.datetime().describe("Analytics snapshot update time."),
  overview: z
    .object({
      pageViews: McpAnalyticsMetricSchema.describe("Page view metric."),
      visitors: McpAnalyticsMetricSchema.describe("Unique visitor metric."),
    })
    .nullable()
    .describe("High-level analytics metrics for the selected range."),
  topPages: z
    .array(McpAnalyticsTopPageSchema)
    .describe("Top pages for the selected range."),
  traffic: z
    .array(McpAnalyticsTrafficPointSchema)
    .describe("Traffic trend for the selected range."),
});

export const McpAnalyticsOverviewOutputSchema = z.object({
  analytics: McpAnalyticsDataSchema.nullable().describe(
    "Analytics details, or null if no data available.",
  ),
  analyticsEnabled: z
    .boolean()
    .describe("Whether analytics data is available."),
  range: z.enum(MCP_ANALYTICS_RANGES).describe("Selected analytics range."),
  recentActivities: z
    .array(McpAnalyticsActivitySchema)
    .describe("Recent blog activity feed."),
  siteStats: McpAnalyticsSiteStatsSchema.describe("Core blog stats."),
});
