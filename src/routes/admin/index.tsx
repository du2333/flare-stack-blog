import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/features/dashboard/components/overview-page";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { dashboardOverviewQuery } from "@/features/dashboard/queries";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/")({
  ssr: "data-only",
  component: OverviewPage,
  pendingComponent: DashboardSkeleton,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(dashboardOverviewQuery);
    return { title: m.admin_overview_title() };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title,
      },
    ],
  }),
});
