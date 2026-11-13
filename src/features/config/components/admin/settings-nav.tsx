import { useConfigEditing } from "./config-editing";
import { useLocation } from "@tanstack/react-router";
import { TabNav } from "@/components/ui/tabs";
import {
  ACCESS_PAGE_IDS,
  ACCESS_PAGE_TO,
  type AccessPageId,
  SETTINGS_PAGE_IDS,
  SETTINGS_PAGE_TO,
  type SettingsPageId,
} from "@/features/config/components/admin/settings-pages";
import { m } from "@/paraglide/messages";

const LABELS: Record<SettingsPageId, () => string> = {
  site: () => m.settings_nav_site(),
  notify: () => m.settings_nav_notify(),
  maintenance: () => m.settings_nav_maintenance(),
};

export function SettingsNav({ current }: { current: SettingsPageId }) {
  const { dirtySections } = useConfigEditing();
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <TabNav
      scrollCue
      aria-label={m.settings_header_title()}
      value={
        SETTINGS_PAGE_IDS.find((id) => SETTINGS_PAGE_TO[id] === pathname) ??
        current
      }
      items={SETTINGS_PAGE_IDS.map((id) => {
        const dirty =
          id === "site"
            ? dirtySections?.site
            : id === "notify"
              ? dirtySections?.notifications
              : false;
        return {
          value: id,
          to: SETTINGS_PAGE_TO[id],
          label: LABELS[id](),
          mark: dirty ? m.settings_config_unsaved() : undefined,
        };
      })}
    />
  );
}

export const ACCESS_LABELS: Record<AccessPageId, () => string> = {
  "api-keys": () => m.settings_nav_api_keys(),
  "agent-skill": () => m.settings_nav_agent_skill(),
};

/** The tabs of 「接入」. */
export function AccessNav({ current }: { current: AccessPageId }) {
  return (
    <TabNav
      scrollCue
      aria-label={m.admin_access_title()}
      value={current}
      items={ACCESS_PAGE_IDS.map((id) => ({
        value: id,
        to: ACCESS_PAGE_TO[id],
        label: ACCESS_LABELS[id](),
      }))}
    />
  );
}
