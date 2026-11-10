import { createLink } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import { m } from "@/paraglide/messages";
import { formatCount, formatWindow } from "./format";

/** A figure in the strip: a small label, the number and one muted line. */
function StatFigureAnchor({
  label,
  value,
  detail,
  dot,
  ...props
}: Omit<ComponentProps<"a">, "children" | "className"> & {
  label: ReactNode;
  /** Already formatted, e.g. with thousands separators. */
  value: ReactNode;
  detail: ReactNode;
  /** `warning` for state that needs fixing, `primary` for something to act on. */
  dot?: "warning" | "primary";
}) {
  return (
    <a {...props} className="dashboard-stat">
      <span className="dashboard-stat-label">{label}</span>
      <span className="dashboard-stat-value">{value}</span>
      <span className="dashboard-stat-detail" data-dot={dot}>
        {detail}
      </span>
    </a>
  );
}

const StatFigure = createLink(StatFigureAnchor);

export const UNREPLIED_SECTION_ID = "dashboard-unreplied";

/** The Admin layout opts out of the router's hash scrolling, so scroll here. */
function showUnreplied() {
  const section = document.getElementById(UNREPLIED_SECTION_ID);
  if (!section) return;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  section.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start",
  });
  section.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
}

function viewsDetail(popularity: DashboardOverview["popularity"]) {
  switch (popularity.state) {
    case "unconfigured":
      return m.dashboard_stat_views_unconfigured();
    case "missing":
      return m.dashboard_stat_views_missing();
    case "expired":
    case "ready":
      return popularity.windowStart !== null && popularity.windowEnd !== null
        ? formatWindow(popularity.windowStart, popularity.windowEnd)
        : "";
    default:
      popularity.state satisfies never;
      return "";
  }
}

/** Four headline figures in one ruled line, each a link to its page. */
export function DashboardStats({
  stats,
  popularity,
}: Pick<DashboardOverview, "stats" | "popularity">) {
  const hasViews =
    popularity.state === "ready" || popularity.state === "expired";
  return (
    <ul className="dashboard-stats" aria-label={m.dashboard_stats_label()}>
      <li>
        <StatFigure
          to="/admin/posts"
          label={m.dashboard_stat_posts()}
          value={formatCount(stats.publishedPosts)}
          detail={
            stats.draftPosts > 0
              ? m.dashboard_stat_drafts({ count: stats.draftPosts })
              : m.dashboard_stat_no_drafts()
          }
        />
      </li>
      <li>
        <StatFigure
          from="/"
          to="/admin/settings/maintenance"
          label={m.dashboard_stat_views()}
          value={hasViews ? formatCount(popularity.totalViews) : "—"}
          detail={viewsDetail(popularity)}
        />
      </li>
      <li>
        <StatFigure
          to="/admin"
          hash={UNREPLIED_SECTION_ID}
          onClick={showUnreplied}
          label={m.dashboard_stat_comments()}
          value={formatCount(stats.comments)}
          detail={
            stats.recentComments > 0
              ? m.dashboard_stat_comments_recent({
                  count: stats.recentComments,
                })
              : m.dashboard_stat_comments_none_recent()
          }
        />
      </li>
      <li>
        <StatFigure
          to="/admin/friend-links"
          search={{
            status: stats.pendingFriendLinks > 0 ? "pending" : "approved",
            page: 1,
          }}
          label={m.dashboard_stat_friend_links()}
          value={formatCount(stats.approvedFriendLinks)}
          detail={
            stats.pendingFriendLinks > 0
              ? m.dashboard_stat_friend_links_pending({
                  count: stats.pendingFriendLinks,
                })
              : m.dashboard_stat_friend_links_none_pending()
          }
          dot={stats.pendingFriendLinks > 0 ? "primary" : undefined}
        />
      </li>
    </ul>
  );
}
