import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import { m } from "@/paraglide/messages";

/** Where a settings notice is fixed: an Admin page, or the release notes. */
export type NoticeTarget =
  | {
      kind: "settings";
      to:
        | "/admin/settings/maintenance"
        | "/admin/settings/notifications"
        | "/admin/settings/site";
    }
  | { kind: "external"; href: string };

export type SettingsNotice = {
  key:
    | "popularity-failed"
    | "popularity-expired"
    | "email"
    | "identity"
    | "update";
  title: string;
  /** One line on what the notice means. */
  description: string;
  target: NoticeTarget;
};

/**
 * The notices that point at somewhere to fix or read, most urgent first: a
 * failed popularity sync or else an expired snapshot (both synced again from
 * the maintenance page), no notification email, the default site identity,
 * a newer release.
 */
export function settingsNotices(
  data: Pick<
    DashboardOverview,
    | "popularityAlert"
    | "adminEmailNeedsSetup"
    | "defaultSiteIdentity"
    | "update"
  >,
): Array<SettingsNotice> {
  const notices: Array<SettingsNotice> = [];
  if (data.popularityAlert === "failed")
    notices.push({
      key: "popularity-failed",
      title: m.admin_overview_popularity_failed(),
      description: m.admin_overview_popularity_sync_failed_desc(),
      target: { kind: "settings", to: "/admin/settings/maintenance" },
    });
  else if (data.popularityAlert === "expired")
    notices.push({
      key: "popularity-expired",
      title: m.admin_overview_popularity_expired(),
      description: m.admin_overview_popularity_expired_desc(),
      target: { kind: "settings", to: "/admin/settings/maintenance" },
    });
  if (data.adminEmailNeedsSetup)
    notices.push({
      key: "email",
      title: m.admin_overview_email_needs_setup(),
      description: m.admin_overview_email_needs_setup_desc(),
      target: { kind: "settings", to: "/admin/settings/notifications" },
    });
  if (data.defaultSiteIdentity)
    notices.push({
      key: "identity",
      title: m.admin_overview_default_site_identity(),
      description: m.admin_overview_default_site_identity_desc(),
      target: { kind: "settings", to: "/admin/settings/site" },
    });
  if (data.update)
    notices.push({
      key: "update",
      title: m.admin_overview_update_available({
        version: data.update.latestVersion,
      }),
      description: m.admin_overview_update_available_desc({
        current: __APP_VERSION__,
      }),
      target: { kind: "external", href: data.update.releaseUrl },
    });
  return notices;
}
