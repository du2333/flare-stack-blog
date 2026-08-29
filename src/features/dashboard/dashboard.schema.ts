import { z } from "zod";

const coercedDate = z.union([z.date(), z.string().pipe(z.coerce.date())]);

export const DashboardRecentPostSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  status: z.enum(["draft", "published"]),
  updatedAt: coercedDate,
});

export const DashboardPendingFriendLinkSchema = z.object({
  id: z.number().int().positive(),
  siteName: z.string(),
  createdAt: coercedDate,
});

export const DashboardRecentCommentSchema = z.object({
  id: z.number().int().positive(),
  userName: z.string().nullable(),
  postTitle: z.string(),
  postSlug: z.string(),
  snippet: z.string(),
  createdAt: coercedDate,
});

export const DashboardOverviewSchema = z.object({
  popularityAlert: z.enum(["failed", "expired"]).nullable(),
  recentPosts: z.array(DashboardRecentPostSchema),
  pendingFriendLinks: z.object({
    items: z.array(DashboardPendingFriendLinkSchema),
    remainingCount: z.number().int().nonnegative(),
  }),
  recentComments: z.array(DashboardRecentCommentSchema),
});

export type DashboardOverview = z.infer<typeof DashboardOverviewSchema>;
