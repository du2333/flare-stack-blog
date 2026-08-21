import * as CacheService from "@/features/cache/cache.service";
import * as DashboardService from "@/features/dashboard/service/dashboard.service";
import { PAGEVIEW_CACHE_KEYS } from "@/features/pageview/pageview.schema";
import { adminProcedure } from "@/lib/orpc/procedure";

const stats = adminProcedure
  .route({
    method: "GET",
    path: "/admin/dashboard",
    summary: "Get dashboard stats",
    tags: ["Admin Dashboard"],
  })
  .handler(({ context }) => DashboardService.getDashboardStats(context));

const refresh = adminProcedure
  .route({
    method: "POST",
    path: "/admin/dashboard/refresh",
    summary: "Refresh dashboard traffic cache",
    tags: ["Admin Dashboard"],
  })
  .handler(async ({ context }) => {
    await CacheService.deleteKey(context, PAGEVIEW_CACHE_KEYS.traffic);
    return DashboardService.getDashboardStats(context);
  });

export default {
  stats,
  refresh,
};
