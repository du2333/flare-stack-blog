import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import { m } from "@/paraglide/messages";

/** Where a settings notice is fixed: an Admin settings page. */
export type NoticeTarget = {
  kind: "settings";
  to:
    | "/admin/settings/maintenance"
    | "/admin/settings/notifications"
    | "/admin/settings/site";
};

export type SettingsNotice = {
  key: "popularity-failed" | "popularity-expired" | "email" | "identity";
  title: string;
  /** One line on what the notice means. */
  description: string;
  target: NoticeTarget;
};

/**
 * The notices that point at somewhere to fix, in the order the overview's
 * head shows them: no notification email, a failed popularity sync or else
 * an expired snapshot (both synced again from the maintenance page), the
 * default site identity. A newer release is not here: the overview's update
 * block carries it.
 */
export function settingsNotices(
  data: Pick<
    DashboardOverview,
    "popularityAlert" | "adminEmailNeedsSetup" | "defaultSiteIdentity"
  >,
): Array<SettingsNotice> {
  const notices: Array<SettingsNotice> = [];
  if (data.adminEmailNeedsSetup)
    notices.push({
      key: "email",
      title: m.admin_overview_email_needs_setup(),
      description: m.admin_overview_email_needs_setup_desc(),
      target: { kind: "settings", to: "/admin/settings/notifications" },
    });
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
  if (data.defaultSiteIdentity)
    notices.push({
      key: "identity",
      title: m.admin_overview_default_site_identity(),
      description: m.admin_overview_default_site_identity_desc(),
      target: { kind: "settings", to: "/admin/settings/site" },
    });
  return notices;
}
