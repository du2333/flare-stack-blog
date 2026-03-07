import { queryOptions } from "@tanstack/react-query";
import { getDashboardStatsFn } from "../api/dashboard.api";

export const DASHBOARD_KEYS = {
  all: ["dashboard"] as const,
  stats: ["dashboard", "stats"] as const,
};

export const dashboardStatsQuery = queryOptions({
  queryKey: DASHBOARD_KEYS.stats,
  queryFn: () => getDashboardStatsFn(),
});
