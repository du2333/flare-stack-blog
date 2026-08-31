import { createFileRoute } from "@tanstack/react-router";
import { MaintenanceSection } from "@/features/config/components/maintenance-section";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/settings/maintenance")({
  ssr: false,
  loader: () => ({ title: m.settings_nav_maintenance() }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
  component: MaintenanceSection,
});
