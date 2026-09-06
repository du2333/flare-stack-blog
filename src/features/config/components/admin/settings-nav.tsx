import { Link, useLocation } from "@tanstack/react-router";
import {
  SETTINGS_PAGE_IDS,
  SETTINGS_PAGE_TO,
  type SettingsPageId,
} from "@/features/config/components/admin/settings-pages";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const LABELS: Record<SettingsPageId, () => string> = {
  site: () => m.settings_nav_site(),
  notify: () => m.settings_nav_notify(),
  "api-keys": () => m.settings_nav_api_keys(),
  maintenance: () => m.settings_nav_maintenance(),
};

export function SettingsNav({ current }: { current: SettingsPageId }) {
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {SETTINGS_PAGE_IDS.map((id) => {
        const to = SETTINGS_PAGE_TO[id];
        const active = current === id || pathname === to;
        return (
          <Link
            key={id}
            to={to}
            className={cn(
              "rounded-xl h-9 px-3 text-sm font-medium",
              active ? "fuwari-btn-primary" : "fuwari-btn-regular",
            )}
          >
            {LABELS[id]()}
          </Link>
        );
      })}
    </div>
  );
}
