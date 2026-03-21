import { createServerFn } from "@tanstack/react-start";
import * as CacheService from "@/features/cache/cache.service";
import * as DashboardService from "@/features/dashboard/service/dashboard.service";
import { PAGEVIEW_CACHE_KEYS } from "@/features/pageview/pageview.schema";
import { adminMiddleware } from "@/lib/middlewares";

export const getDashboardStatsFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(({ context }) => DashboardService.getDashboardStats(context));

export const refreshDashboardCacheFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    await CacheService.deleteKey(context, PAGEVIEW_CACHE_KEYS.traffic);
    return DashboardService.getDashboardStats(context);
  });
