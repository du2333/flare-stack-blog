import { z } from "zod";

export const TrafficOverviewSchema = z.object({
  pageViews: z.object({ value: z.number(), prev: z.number().optional() }),
  visitors: z.object({ value: z.number(), prev: z.number().optional() }),
});

export const TrafficRangeDataSchema = z.object({
  traffic: z.array(z.object({ date: z.number(), views: z.number() })),
  overview: TrafficOverviewSchema.optional(),
  topPages: z
    .array(z.object({ slug: z.string(), title: z.string(), views: z.number() }))
    .optional(),
  lastUpdated: z.number(),
});

export const CachedAllRangesSchema = z.record(
  z.enum(["24h", "7d", "30d", "90d"]),
  TrafficRangeDataSchema,
);

export type TrafficRangeData = z.infer<typeof TrafficRangeDataSchema>;

export const ViewCountsSchema = z.record(z.string(), z.number());

export const PAGEVIEW_CACHE_KEYS = {
  traffic: ["dashboard", "traffic"] as const,
  popular: ["homepage", "popular"] as const,
  viewCounts: (slugs: string[]) =>
    ["pageview", "counts", ...[...slugs].sort()] as const,
} as const;
