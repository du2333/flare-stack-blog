import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/lib/middlewares";
import * as DashboardService from "@/features/dashboard/service/dashboard.service";
import * as CacheService from "@/features/cache/cache.service";
import { DASHBOARD_CACHE_KEYS } from "@/features/dashboard/dashboard.schema";

export const getDashboardStatsFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(({ context }) => DashboardService.getDashboardStats(context));

export const refreshDashboardCacheFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    await CacheService.deleteKey(context, DASHBOARD_CACHE_KEYS.umamiStats);
    return DashboardService.getDashboardStats(context);
  });
