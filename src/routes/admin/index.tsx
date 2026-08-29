import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/features/dashboard/components/dashboard-page";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { dashboardOverviewQuery } from "@/features/dashboard/queries";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/")({
  ssr: "data-only",
  component: DashboardPage,
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
