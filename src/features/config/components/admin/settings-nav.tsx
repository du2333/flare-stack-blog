import { useConfigEditing } from "./config-editing";
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
  const { dirtySections } = useConfigEditing();
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <div className="settings-tabs">
      {SETTINGS_PAGE_IDS.map((id) => {
        const to = SETTINGS_PAGE_TO[id];
        const active = current === id || pathname === to;
        const dirty =
          id === "site"
            ? dirtySections?.site
            : id === "notify"
              ? dirtySections?.notifications
              : false;
        return (
          <Link
            key={id}
            to={to}
            aria-current={active ? "page" : undefined}
            className={cn("settings-tab", active && "active")}
          >
            {LABELS[id]()}
            {dirty && (
              <span
                className="ml-1.5 text-xs"
                aria-label={m.settings_config_unsaved()}
              >
                *
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
