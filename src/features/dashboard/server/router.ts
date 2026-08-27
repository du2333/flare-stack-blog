import * as DashboardService from "@/features/dashboard/service/dashboard.service";
import { adminProcedure } from "@/lib/orpc/procedure";

const stats = adminProcedure
  .route({
    method: "GET",
    path: "/admin/dashboard",
    summary: "Get dashboard stats",
    tags: ["Admin Dashboard"],
  })
  .handler(({ context }) => DashboardService.getDashboardStats(context));

export default {
  stats,
};
