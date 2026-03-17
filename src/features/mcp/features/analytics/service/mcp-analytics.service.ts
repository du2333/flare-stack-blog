import type { DashboardRange } from "@/features/dashboard/dashboard.schema";
import * as DashboardService from "@/features/dashboard/service/dashboard.service";
import { serializeMcpDate } from "../../../service/mcp-serialize";

export async function getAnalyticsOverview(
  context: DbContext & { executionCtx: ExecutionContext },
  input: {
    range?: DashboardRange;
  },
) {
  const range = input.range ?? "24h";
  const dashboard = await DashboardService.getDashboardStats(context);
  const rangeData = dashboard.trafficByRange?.[range];

  return {
    analytics: rangeData
      ? {
          lastUpdated: serializeMcpDate(new Date(rangeData.lastUpdated)),
          overview: rangeData.overview ?? null,
          topPages: (rangeData.topPages ?? []).map((page) => ({
            path: page.x,
            views: page.y,
          })),
          traffic: rangeData.traffic.map((point) => ({
            date: serializeMcpDate(new Date(point.date)),
            views: point.views,
          })),
        }
      : null,
    analyticsEnabled: !!rangeData,
    range,
    recentActivities: dashboard.activities.map((activity) => ({
      link: "link" in activity ? activity.link : null,
      rootId: "rootId" in activity ? activity.rootId : null,
      text: activity.text,
      time: serializeMcpDate(activity.time),
      type: activity.type,
    })),
    siteStats: dashboard.stats,
    umamiUrl: dashboard.umamiUrl ?? null,
  };
}
