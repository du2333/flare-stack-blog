import { createFileRoute, redirect } from "@tanstack/react-router";
import { legacySettingsSearchSchema } from "@/features/config/legacy-settings-search";
import { LEGACY_SETTINGS_TAB_TO } from "@/features/config/components/admin/settings-pages";

export const Route = createFileRoute("/admin/settings/")({
  ssr: false,
  validateSearch: legacySettingsSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      from: "/",
      to: search.tab
        ? LEGACY_SETTINGS_TAB_TO[search.tab]
        : "/admin/settings/site",
    });
  },
});
