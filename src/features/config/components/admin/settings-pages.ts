/** The tabs of 「设置」: what the site is, how it notifies, its upkeep. */
export const SETTINGS_PAGE_TO = {
  site: "/admin/settings/site",
  notify: "/admin/settings/notifications",
  maintenance: "/admin/settings/maintenance",
} as const;

export type SettingsPageId = keyof typeof SETTINGS_PAGE_TO;

export const SETTINGS_PAGE_IDS = [
  "site",
  "notify",
  "maintenance",
] as const satisfies ReadonlyArray<SettingsPageId>;

/** The tabs of 「接入」: how agents and scripts reach the blog. */
export const ACCESS_PAGE_TO = {
  "api-keys": "/admin/access/api-keys",
  "agent-skill": "/admin/access/agent-skill",
} as const;

export type AccessPageId = keyof typeof ACCESS_PAGE_TO;

export const ACCESS_PAGE_IDS = [
  "api-keys",
  "agent-skill",
] as const satisfies ReadonlyArray<AccessPageId>;

export function settingsSectionFromPath(
  pathname: string,
): SettingsPageId | null {
  const path = pathname.replace(/\/+$/, "");
  if (path.endsWith("/settings/site")) return "site";
  if (path.endsWith("/settings/notifications")) return "notify";
  if (path.endsWith("/settings/maintenance")) return "maintenance";
  return null;
}

export function accessSectionFromPath(pathname: string): AccessPageId | null {
  const path = pathname.replace(/\/+$/, "");
  if (path.endsWith("/access/api-keys")) return "api-keys";
  if (path.endsWith("/access/agent-skill")) return "agent-skill";
  return null;
}
