import { z } from "zod";
import { coercedDate } from "@/lib/orpc/dates";

const DashboardRecentPostSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  status: z.enum(["draft", "published"]),
  pinnedAt: coercedDate.nullable(),
  updatedAt: coercedDate,
  hasUnpublishedChanges: z.boolean(),
});

const DashboardPendingFriendLinkSchema = z.object({
  id: z.number().int().positive(),
  siteName: z.string(),
  siteUrl: z.string(),
  logoUrl: z.string().nullable(),
  createdAt: coercedDate,
});

/**
 * An unreplied Comment, on a public Post or on a Moment (ADR 0037): the
 * post fields are null for a Moment's Comment and the moment fields for a
 * Post's.
 */
const DashboardCommentSchema = z.object({
  id: z.number().int().positive(),
  postId: z.number().int().positive().nullable(),
  momentId: z.number().int().positive().nullable(),
  rootId: z.number().int().positive().nullable(),
  userId: z.string().nullable(),
  userName: z.string().nullable(),
  userImage: z.string().nullable(),
  userMuted: z.boolean(),
  postTitle: z.string().nullable(),
  postSlug: z.string().nullable(),
  /** The start of the Moment's text, or what it holds when it has none. */
  momentTitle: z.string().nullable(),
  /** The Comment's public link (ADR 0015), on its Post's or Moment's page. */
  commentPath: z.string(),
  snippet: z.string(),
  createdAt: coercedDate,
});

const count = z.number().int().nonnegative();

const DashboardStatsSchema = z.object({
  publishedPosts: count,
  draftPosts: count,
  /** Published Comments on public Posts and on Moments. */
  comments: count,
  /** Of those, created in the last DASHBOARD_RECENT_COMMENT_DAYS days. */
  recentComments: count,
  approvedFriendLinks: count,
  pendingFriendLinks: count,
});

const DashboardTopPostSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  slug: z.string(),
  views: count,
});

const DashboardPopularitySchema = z.object({
  state: z.enum(["unconfigured", "missing", "expired", "ready"]),
  /** The snapshot's UTC window, in milliseconds. */
  windowStart: count.nullable(),
  windowEnd: count.nullable(),
  totalViews: count,
  topPosts: z.array(DashboardTopPostSchema),
});

const DashboardWritingHourSchema = z.object({
  /** Hours since the Unix epoch, in UTC. */
  hour: count,
  /** Revisions saved and Posts created in that hour. */
  count: z.number().int().positive(),
});

const DashboardUpdateSchema = z.object({
  latestVersion: z.string(),
  releaseUrl: z.url(),
});

export const DashboardOverviewSchema = z.object({
  popularityAlert: z.enum(["failed", "expired"]).nullable(),
  adminEmailNeedsSetup: z.boolean(),
  defaultSiteIdentity: z.boolean(),
  /** A newer stable release, known only from the version check's cache. */
  update: DashboardUpdateSchema.nullable(),
  stats: DashboardStatsSchema,
  popularity: DashboardPopularitySchema,
  /**
   * Writing events of the last DASHBOARD_WRITING_LOOKBACK_DAYS days per UTC
   * hour, oldest first; the page groups them into local days.
   */
  writingActivity: z.array(DashboardWritingHourSchema),
  latestDraft: DashboardRecentPostSchema.nullable(),
  /** Most recently edited Posts, without `latestDraft`. */
  recentPosts: z.array(DashboardRecentPostSchema),
  pendingFriendLinks: z.object({
    items: z.array(DashboardPendingFriendLinkSchema),
    remainingCount: count,
  }),
  /** Visitor Comments no Admin has replied to, newest first. */
  unrepliedComments: z.object({
    items: z.array(DashboardCommentSchema),
    total: count,
  }),
});

export const UnrepliedCommentsInputSchema = z.strictObject({
  limit: z.number().int().min(1).max(50).default(20),
  /** Continue after this Comment: the previous page's `nextBeforeId`. */
  beforeId: z.number().int().positive().optional(),
});

export const UnrepliedCommentsPageSchema = z.object({
  items: z.array(DashboardCommentSchema),
  /** Every unreplied Comment, not only this page's. */
  total: count,
  /** Pass as `beforeId` for the next page; null on the last page. */
  nextBeforeId: z.number().int().positive().nullable(),
});

export type DashboardOverview = z.infer<typeof DashboardOverviewSchema>;
export type DashboardComment = z.infer<typeof DashboardCommentSchema>;
export type UnrepliedCommentsPage = z.infer<typeof UnrepliedCommentsPageSchema>;
export type UnrepliedCommentsInput = z.infer<
  typeof UnrepliedCommentsInputSchema
>;
