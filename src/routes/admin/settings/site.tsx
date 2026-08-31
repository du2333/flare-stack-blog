import { createFileRoute } from "@tanstack/react-router";
import { SiteStudio } from "@/features/config/components/admin/site-studio";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/settings/site")({
  ssr: false,
  loader: () => ({ title: m.settings_nav_site() }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
  component: SiteStudio,
});
