import { DashboardOverviewSchema } from "@/features/dashboard/dashboard.schema";
import * as DashboardService from "@/features/dashboard/service/dashboard.service";
import { adminProcedure } from "@/lib/orpc/procedure";

const overview = adminProcedure
  .route({
    method: "GET",
    path: "/admin/dashboard",
    summary: "Get admin overview inbox",
    tags: ["Admin Dashboard"],
  })
  .output(DashboardOverviewSchema)
  .handler(({ context }) => DashboardService.getDashboardOverview(context));

export default {
  overview,
};
