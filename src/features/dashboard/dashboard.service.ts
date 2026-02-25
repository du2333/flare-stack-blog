import { z } from "zod";
import { UmamiClient } from "./services/umami-client";
import type {
  DashboardRange,
  DashboardResponse,
} from "@/features/dashboard/dashboard.schema";
import {
  ALL_RANGES,
  DASHBOARD_CACHE_KEYS,
  TrafficDataSchema,
} from "@/features/dashboard/dashboard.schema";
import * as DashboardRepo from "@/features/dashboard/data/dashboard.data";
import * as MediaRepo from "@/features/media/data/media.data";
import * as CacheService from "@/features/cache/cache.service";
import { serverEnv } from "@/lib/env/server.env";

// Schema for single range data
const MetricSchema = z.object({
  value: z.number(),
  prev: z.number().optional(),
});

const RangeDataSchema = z.object({
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
  topPages: z.array(z.object({ x: z.string(), y: z.number() })).optional(),
  lastUpdated: z.number(),
});

// Schema for all ranges cached together
const CachedAllRangesSchema = z.record(
  z.enum(["24h", "7d", "30d", "90d"]),
  RangeDataSchema,
);

type RangeData = z.infer<typeof RangeDataSchema>;

async function fetchUmamiDataForRange(
  umami: UmamiClient,
  range: DashboardRange,
): Promise<RangeData> {
  const now = new Date();
  const endAt = now.getTime();
  let startAt: number;
  let prevStartAt: number;

  if (range === "24h") {
    const d = new Date(now);
    d.setHours(d.getHours() - 24, 0, 0, 0);
    startAt = d.getTime();
    const prev = new Date(startAt);
    prev.setHours(prev.getHours() - 24);
    prevStartAt = prev.getTime();
  } else if (range === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    startAt = d.getTime();
    const prev = new Date(startAt);
    prev.setDate(prev.getDate() - 7);
    prevStartAt = prev.getTime();
  } else if (range === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    d.setHours(0, 0, 0, 0);
    startAt = d.getTime();
    const prev = new Date(startAt);
    prev.setDate(prev.getDate() - 30);
    prevStartAt = prev.getTime();
  } else {
    // 90d
    const d = new Date(now);
    d.setDate(d.getDate() - 90);
    d.setHours(0, 0, 0, 0);
    startAt = d.getTime();
    const prev = new Date(startAt);
    prev.setDate(prev.getDate() - 90);
    prevStartAt = prev.getTime();
  }

  const unit = range === "24h" ? "hour" : "day";

  const [stats, prevStats, pageViews, topPagesRaw] = await Promise.all([
    umami.getStats(startAt, endAt),
    umami.getStats(prevStartAt, startAt),
    umami.getPageViews(startAt, endAt, unit),
    umami.getMetrics(startAt, endAt, "path", 10, { path: "c./post/" }),
  ]);

  // Normalize and aggregate
  const aggregated = new Map<string, number>();
  (topPagesRaw || []).forEach((p) => {
    // Normalize: remove query and hash
    let path = p.x;
    if (path.includes("#")) path = path.split("#")[0];
    if (path.includes("?")) path = path.split("?")[0];

    aggregated.set(path, (aggregated.get(path) || 0) + p.y);
  });

  // Filter and convert to array of objects
  const mergedPages = Array.from(aggregated.entries())
    .map(([x, y]) => ({ x, y }))
    .sort((a, b) => b.y - a.y)
    .slice(0, 5);

  // Fetch titles for top pages
  const topPages = mergedPages.map((p) => {
    const slug = p.x.replace(/^\/post\//, "").replace(/\/$/, "");
    return {
      x: slug || p.x, // Use slug
      y: p.y,
    };
  });

  let cachedOverview;
  const cachedTraffic: Array<{ date: number; views: number }> = [];

  if (stats) {
    cachedOverview = {
      visitors: {
        value: stats.visitors.value,
        prev: prevStats?.visitors.value || 0,
      },
      pageViews: {
        value: stats.pageviews.value,
        prev: prevStats?.pageviews.value || 0,
      },
      visits: {
        value: stats.visits.value,
        prev: prevStats?.visits.value || 0,
      },
      bounces: {
        value: stats.bounces.value,
        prev: prevStats?.bounces.value || 0,
      },
      totalTime: {
        value: stats.totaltime.value,
        prev: prevStats?.totaltime.value || 0,
      },
    };
  }

  if (pageViews?.pageviews) {
    const rawData = new Map<number, number>();
    pageViews.pageviews.forEach((p: { x: string; y: number }) => {
      const d = new Date(p.x);
      if (range === "24h") d.setMinutes(0, 0, 0);
      else d.setHours(0, 0, 0, 0);
      rawData.set(d.getTime(), p.y);
    });

    const loopEnd =
      range === "24h"
        ? new Date(now).setMinutes(0, 0, 0)
        : new Date(now).setHours(0, 0, 0, 0);

    const current = new Date(startAt);
    while (current.getTime() <= loopEnd) {
      const t = current.getTime();
      cachedTraffic.push({
        date: t,
        views: rawData.get(t) || 0,
      });

      if (range === "24h") {
        current.setHours(current.getHours() + 1);
      } else {
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
      }
    }
  }

  return {
    overview: cachedOverview,
    topPages,
    traffic: cachedTraffic,
    lastUpdated: Date.now(),
  };
}

export async function getDashboardStats(
  context: DbContext & { executionCtx: ExecutionContext },
): Promise<DashboardResponse> {
  const { db } = context;

  const [
    pendingComments,
    publishedPosts,
    drafts,
    mediaSize,
    totalUsers,
    totalGuitarTabs,
    pendingGuitarTabs,
    recentComments,
    recentPosts,
    recentUsers,
    recentGuitarTabs,
  ] = await Promise.all([
    DashboardRepo.getPendingCommentsCount(db),
    DashboardRepo.getPublishedPostsCount(db),
    DashboardRepo.getDraftsCount(db),
    MediaRepo.getTotalMediaSize(db),
    DashboardRepo.getTotalUsersCount(db),
    DashboardRepo.getTotalGuitarTabsCount(db),
    DashboardRepo.getPendingGuitarTabsCount(db),
    DashboardRepo.getRecentComments(db, 10),
    DashboardRepo.getRecentPosts(db, 10),
    DashboardRepo.getRecentUsers(db, 10),
    DashboardRepo.getRecentGuitarTabs(db, 10),
  ]);

  const env = serverEnv(context.env);
  let trafficByRange: DashboardResponse["trafficByRange"];
  let umamiUrl: string | undefined;

  const umamiWebsiteId = env.VITE_UMAMI_WEBSITE_ID;
  const umamiSrc = env.UMAMI_SRC;

  if (umamiWebsiteId && umamiSrc) {
    const umami = new UmamiClient({
      websiteId: umamiWebsiteId,
      src: umamiSrc,
      apiKey: env.UMAMI_API_KEY,
      username: env.UMAMI_USERNAME,
      password: env.UMAMI_PASSWORD,
    });

    // Construct dashboard URL based on mode
    umamiUrl = umami.isUmamiCloud
      ? `https://cloud.umami.is/analytics/us/websites/${umamiWebsiteId}`
      : `${umamiSrc.replace(/\/$/, "")}/websites/${umamiWebsiteId}`;

    // Fetcher for all ranges data - cached as a single unit
    const fetcher = async () => {
      const results = await Promise.all(
        ALL_RANGES.map(async (range) => ({
          range,
          data: await fetchUmamiDataForRange(umami, range),
        })),
      );

      return Object.fromEntries(
        results.map(({ range, data }) => [range, data]),
      ) as NonNullable<DashboardResponse["trafficByRange"]>;
    };

    // Cache all ranges together with 3h TTL (shortest range's TTL)
    trafficByRange = await CacheService.get(
      context,
      DASHBOARD_CACHE_KEYS.umamiStats,
      CachedAllRangesSchema,
      fetcher,
      { ttl: "3h" },
    );
  }

  const activities = [
    ...recentComments
      .filter((c) => c.posts !== null)
      .map((c) => ({
        type: "comment" as const,
        text: `用户 ${c.user?.name || "Anonymous"} 在《${c.posts!.title}》下评论了`,
        time: c.comments.createdAt,
        link: `/post/${c.posts!.slug}?highlightCommentId=${c.comments.id}&rootId=${c.comments.rootId ?? c.comments.id}#comment-${c.comments.id}`,
        rootId: c.comments.rootId ?? c.comments.id,
      })),
    ...recentPosts.map((p) => ({
      type: "post" as const,
      text: `文章《${p.title}》已发布`,
      time: p.publishedAt,
      link: `/post/${p.slug}`,
    })),
    ...recentUsers.map((u) => ({
      type: "user" as const,
      text: `新用户 ${u.name} 注册了`,
      time: u.createdAt,
    })),
    ...recentGuitarTabs.map((t) => {
      const statusLabel = t.status === "approved" ? "已审核" : t.status === "pending" ? "待审核" : "已拒绝";
      const uploader = t.uploaderName ? `用户 ${t.uploaderName} 上传了` : "上传了";
      return {
        type: "guitar-tab" as const,
        text: `${uploader}吉他谱《${t.title || "未命名"}》(${t.artist || "未知艺术家"}) — ${statusLabel}`,
        time: t.createdAt,
        link: t.slug ? `/guitar-tab/${t.slug}` : undefined,
      };
    }),
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
      totalUsers,
      totalGuitarTabs,
      pendingGuitarTabs,
    },
    activities,
    trafficByRange,
    umamiUrl,
  };
}
