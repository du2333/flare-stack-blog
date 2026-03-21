import * as CacheService from "@/features/cache/cache.service";
import type {
  DashboardRange,
  DashboardResponse,
} from "@/features/dashboard/dashboard.schema";
import { ALL_RANGES } from "@/features/dashboard/dashboard.schema";
import * as DashboardRepo from "@/features/dashboard/data/dashboard.data";
import * as MediaRepo from "@/features/media/data/media.data";
import * as PageviewRepo from "@/features/pageview/data/pageview.data";
import {
  CachedAllRangesSchema,
  PAGEVIEW_CACHE_KEYS,
  type TrafficRangeData,
} from "@/features/pageview/pageview.schema";
import { m } from "@/paraglide/messages";

function getTimeRange(range: DashboardRange) {
  const now = new Date();
  const endAt = now;

  let startAt: Date;
  let prevStartAt: Date;

  if (range === "24h") {
    startAt = new Date(now);
    startAt.setHours(startAt.getHours() - 24, 0, 0, 0);
    prevStartAt = new Date(startAt);
    prevStartAt.setHours(prevStartAt.getHours() - 24);
  } else {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    startAt = new Date(now);
    startAt.setDate(startAt.getDate() - days);
    startAt.setHours(0, 0, 0, 0);
    prevStartAt = new Date(startAt);
    prevStartAt.setDate(prevStartAt.getDate() - days);
  }

  return { startAt, endAt, prevStartAt };
}

async function fetchTrafficDataForRange(
  db: DbContext["db"],
  range: DashboardRange,
): Promise<TrafficRangeData> {
  const { startAt, endAt, prevStartAt } = getTimeRange(range);
  const unit = range === "24h" ? "hour" : "day";

  const [stats, prevStats, traffic, topPages] = await Promise.all([
    PageviewRepo.getStats(db, startAt, endAt),
    PageviewRepo.getStats(db, prevStartAt, startAt),
    PageviewRepo.getTrafficTrend(db, startAt, endAt, unit),
    PageviewRepo.getTopPages(db, startAt, endAt, 5),
  ]);

  return {
    overview: {
      pageViews: { value: stats.pv, prev: prevStats.pv },
      visitors: { value: stats.uv, prev: prevStats.uv },
    },
    traffic,
    topPages,
    lastUpdated: Date.now(),
  };
}

export async function getDashboardStats(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  const { db } = context;

  const [
    pendingComments,
    publishedPosts,
    drafts,
    mediaSize,
    recentComments,
    recentPosts,
    recentUsers,
  ] = await Promise.all([
    DashboardRepo.getPendingCommentsCount(db),
    DashboardRepo.getPublishedPostsCount(db),
    DashboardRepo.getDraftsCount(db),
    MediaRepo.getTotalMediaSize(db),
    DashboardRepo.getRecentComments(db, 10),
    DashboardRepo.getRecentPosts(db, 10),
    DashboardRepo.getRecentUsers(db, 10),
  ]);

  // Fetch traffic data from self-hosted pageview stats
  const fetcher = async () => {
    const results = await Promise.all(
      ALL_RANGES.map(async (range) => ({
        range,
        data: await fetchTrafficDataForRange(db, range),
      })),
    );

    return Object.fromEntries(
      results.map(({ range, data }) => [range, data]),
    ) as NonNullable<DashboardResponse["trafficByRange"]>;
  };

  const trafficByRange = await CacheService.get(
    context,
    PAGEVIEW_CACHE_KEYS.traffic,
    CachedAllRangesSchema,
    fetcher,
    { ttl: "3h" },
  );

  const activities = [
    ...recentComments
      .filter((c) => c.posts !== null)
      .map((c) => ({
        type: "comment" as const,
        text: m.admin_overview_activity_comment({
          userName: c.user?.name || m.admin_overview_activity_anonymous(),
          postTitle: c.posts!.title,
        }),
        time: c.comments.createdAt,
        link: `/post/${c.posts!.slug}?highlightCommentId=${c.comments.id}&rootId=${c.comments.rootId ?? c.comments.id}#comment-${c.comments.id}`,
        rootId: c.comments.rootId ?? c.comments.id,
      })),
    ...recentPosts.map((p) => ({
      type: "post" as const,
      text: m.admin_overview_activity_post_published({
        postTitle: p.title,
      }),
      time: p.publishedAt,
      link: `/post/${p.slug}`,
    })),
    ...recentUsers.map((u) => ({
      type: "user" as const,
      text: m.admin_overview_activity_user_registered({
        userName: u.name,
      }),
      time: u.createdAt,
    })),
  ]
    .sort((a, b) => {
      const timeA = a.time ? new Date(a.time).getTime() : 0;
      const timeB = b.time ? new Date(b.time).getTime() : 0;
      return timeB - timeA;
    })
    .slice(0, 10);

  return {
    stats: {
      pendingComments,
      publishedPosts,
      drafts,
      mediaSize,
    },
    activities,
    trafficByRange,
  };
}
