import { createFileRoute } from "@tanstack/react-router";
import { NotifyStudio } from "@/features/config/components/admin/notify-studio";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/settings/notifications")({
  ssr: false,
  loader: () => ({ title: m.settings_nav_notify() }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
  component: NotifyStudio,
});
