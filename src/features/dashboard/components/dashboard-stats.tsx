import { createLink } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import { SectionHeading } from "@/components/ui/page-heading";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { formatCount, formatWindow } from "./format";

/** A figure: a small label, the number and one muted line that may wrap. */
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

/**
 * The site's four headline figures, each a link to its page: in one row when
 * the column is wide enough, two to a row otherwise. Their lines wrap rather
 * than clip.
 */
export function DashboardStats({
  stats,
  popularity,
  className,
}: Pick<DashboardOverview, "stats" | "popularity"> & { className?: string }) {
  const hasViews =
    popularity.state === "ready" || popularity.state === "expired";
  return (
    <section className={cn("dashboard-section dashboard-status", className)}>
      <SectionHeading size="md" title={m.dashboard_stats_label()} />
      <ul className="dashboard-stats">
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
            to="/admin/comments"
            search={{ view: "all" }}
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
    </section>
  );
}
