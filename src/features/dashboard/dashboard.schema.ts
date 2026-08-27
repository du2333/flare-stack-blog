import { z } from "zod";

export const DashboardStatsSchema = z.object({
  publishedPosts: z.number(),
  drafts: z.number(),
  mediaSize: z.number(),
});

export const ActivityLogItemSchema = z.object({
  type: z.enum(["comment", "post", "user"]),
  text: z.string(),
  time: z.date().nullable(),
  link: z.string().optional(),
  rootId: z.number().optional(),
});

export const DashboardResponseSchema = z.object({
  stats: DashboardStatsSchema,
  activities: z.array(ActivityLogItemSchema),
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
export type ActivityLogItem = z.infer<typeof ActivityLogItemSchema>;
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
