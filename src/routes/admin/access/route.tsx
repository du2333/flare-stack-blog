import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { SettingsShell } from "@/features/config/components/admin/settings-shell";
import {
  ACCESS_LABELS,
  AccessNav,
} from "@/features/config/components/admin/settings-nav";
import { accessSectionFromPath } from "@/features/config/components/admin/settings-pages";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/access")({
  ssr: false,
  // The top bar names 「接入」; the tabs and the tab title name the section.
  loader: () => ({
    title: m.admin_access_title(),
    topBarTitle: m.admin_access_title(),
  }),
  component: AccessLayout,
});

function AccessLayout() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const page = accessSectionFromPath(pathname) ?? "api-keys";

  return (
    <SettingsShell
      title={m.admin_access_title()}
      section={page}
      // Both tabs sit in the form body, at the form width, so the edges stay
      // put between them; the key list is a card of its own that fits its rows.
      body="form"
      regionLabel={ACCESS_LABELS[page]()}
      tabs={<AccessNav current={page} />}
    >
      <Outlet />
    </SettingsShell>
  );
}
