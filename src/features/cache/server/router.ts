import { invalidate } from "@/features/cache/public-cache";
import { adminProcedure } from "@/lib/orpc/procedure";

const invalidateSite = adminProcedure
  .route({
    method: "POST",
    path: "/admin/cache/invalidate",
    summary: "Invalidate the public cache",
    tags: ["Admin Cache"],
  })
  .handler(async ({ context }) => {
    await invalidate.all(context);
    return { success: true };
  });

export default {
  invalidate: invalidateSite,
};
