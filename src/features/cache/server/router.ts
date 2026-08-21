import * as CacheService from "@/features/cache/cache.service";
import { adminProcedure } from "@/lib/orpc/procedure";

const invalidate = adminProcedure
  .route({
    method: "POST",
    path: "/admin/cache/invalidate",
    summary: "Invalidate the public cache",
    tags: ["Admin Cache"],
  })
  .handler(({ context }) => CacheService.invalidateSiteCache(context));

export default {
  invalidate,
};
