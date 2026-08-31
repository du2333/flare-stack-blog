import { createFileRoute } from "@tanstack/react-router";
import { ApiKeySettingsSection } from "@/features/api-keys/components/api-key-settings-section";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/settings/api-keys")({
  ssr: false,
  loader: () => ({ title: m.settings_nav_api_keys() }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
  component: ApiKeySettingsSection,
});
