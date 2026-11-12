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
  key: "popularity-failed" | "email" | "identity" | "update";
  title: string;
  /** One line on what the notice means. */
  description: string;
  target: NoticeTarget;
};

/**
 * The notices that point at somewhere to fix or read, most urgent first. An
 * expired popularity snapshot is not among them: it is synced from the
 * popular list itself.
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

export type PendingTile =
  | {
      key: "comments" | "friendLinks" | "drafts";
      label: string;
      count: number;
      /** The most recent item in one line; null when there is none. */
      latest: string | null;
    }
  | {
      key: "notices";
      label: string;
      count: number;
      /** The most urgent notice's title. */
      latest: string | null;
      /** Every notice, most urgent first: one links, several open a menu. */
      notices: Array<SettingsNotice>;
    };

/**
 * The first row of the overview: what waits on the Admin. A tile at zero is
 * still returned (the page draws it quiet); the settings tile exists only
 * while a notice does.
 */
export function pendingTiles(data: DashboardOverview): Array<PendingTile> {
  const comment = data.unrepliedComments.items[0];
  const friendLink = data.pendingFriendLinks.items[0];
  const draft = data.latestDraft;
  const notices = settingsNotices(data);
  const tiles: Array<PendingTile> = [
    {
      key: "comments",
      label: m.dashboard_unreplied_title(),
      count: data.unrepliedComments.total,
      latest: comment
        ? commentLine(
            comment.userName || m.admin_overview_activity_anonymous(),
            comment.snippet,
          )
        : null,
    },
    {
      key: "friendLinks",
      label: m.dashboard_pending_links_title(),
      count: data.stats.pendingFriendLinks,
      latest: friendLink ? friendLink.siteName : null,
    },
    {
      key: "drafts",
      label: m.dashboard_tile_drafts(),
      count: data.stats.draftPosts,
      latest: draft ? draft.title.trim() || m.common_untitled() : null,
    },
  ];
  if (notices.length > 0)
    tiles.push({
      key: "notices",
      label: m.dashboard_tile_notices(),
      count: notices.length,
      latest: notices[0]?.title ?? null,
      notices,
    });
  return tiles;
}

function commentLine(name: string, snippet: string) {
  return snippet ? m.dashboard_tile_comment_line({ name, snippet }) : name;
}
