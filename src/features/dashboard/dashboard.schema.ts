import { z } from "zod";

export const DashboardStatsSchema = z.object({
  pendingComments: z.number(),
  publishedPosts: z.number(),
  drafts: z.number(),
  mediaSize: z.number(),
  totalUsers: z.number(),
  totalGuitarTabs: z.number(),
  pendingGuitarTabs: z.number(),
});

export const ActivityLogItemSchema = z.object({
  type: z.enum(["comment", "post", "user", "guitar-tab"]),
  text: z.string(),
  time: z.date().nullable(),
  link: z.string().optional(),
  rootId: z.number().optional(),
});

export const TrafficDataSchema = z.object({
  date: z.number(),
  views: z.number(),
});

const MetricSchema = z.object({
  value: z.number(),
  prev: z.number().optional(),
});

export const DashboardResponseSchema = z.object({
  stats: DashboardStatsSchema,
  activities: z.array(ActivityLogItemSchema),
  trafficByRange: z
    .record(
      z.enum(["24h", "7d", "30d", "90d"]),
      z.object({
        traffic: z.array(TrafficDataSchema),
        overview: z
          .object({
            visitors: MetricSchema,
            pageViews: MetricSchema,
            visits: MetricSchema,
            bounces: MetricSchema,
            totalTime: MetricSchema,
          })
          .optional(),
        topPages: z
          .array(z.object({ x: z.string(), y: z.number() }))
          .optional(),
        lastUpdated: z.number(),
      }),
    )
    .optional(),
  umamiUrl: z.string().optional(),
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
export type ActivityLogItem = z.infer<typeof ActivityLogItemSchema>;
export type TrafficData = z.infer<typeof TrafficDataSchema>;
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
export type DashboardRange = "24h" | "7d" | "30d" | "90d";

export const ALL_RANGES: Array<DashboardRange> = ["24h", "7d", "30d", "90d"];

export const DASHBOARD_CACHE_KEYS = {
  umamiStats: ["dashboard", "umami"] as const,
} as const;
