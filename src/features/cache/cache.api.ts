import { createServerFn } from "@tanstack/react-start";
import * as CacheService from "@/features/cache/cache.service";
import { adminMiddleware } from "@/lib/middlewares";

export const invalidateSiteCacheFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(async ({ context }) => CacheService.invalidateSiteCache(context));
