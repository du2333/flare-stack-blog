import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { SettingsSectionFrame } from "@/features/config/components/admin/settings-form-page";
import {
  type SettingsPageId,
  settingsSectionFromPath,
} from "@/features/config/components/admin/settings-pages";
import { systemConfigQuery } from "@/features/config/queries";
import { m } from "@/paraglide/messages";

const TITLES: Record<SettingsPageId, () => string> = {
  site: () => m.settings_nav_site(),
  notify: () => m.settings_nav_notify(),
  "api-keys": () => m.settings_nav_api_keys(),
  maintenance: () => m.settings_nav_maintenance(),
};

export const Route = createFileRoute("/admin/settings")({
  ssr: false,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(systemConfigQuery);
    return { title: m.settings_header_title() };
  },
  component: SettingsLayout,
});

function SettingsLayout() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const page = settingsSectionFromPath(pathname);

  return (
    <SettingsSectionFrame
      title={page ? TITLES[page]() : m.settings_header_title()}
      nav={page}
    >
      <Outlet />
    </SettingsSectionFrame>
  );
}
