import { Link } from "@tanstack/react-router";
import { ArrowRight, ChartNoAxesColumn, ExternalLink } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { iconButtonClass } from "@/components/ui/icon-button";
import { SectionHeading } from "@/components/ui/page-heading";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { formatWindow } from "./format";
import { RankedBarList, RankedBarRow } from "./ranked-bar-list";

/** The most-read public Posts of the popularity snapshot's 30 days. */
export function DashboardPopular({
  popularity,
  className,
}: {
  popularity: DashboardOverview["popularity"];
  className?: string;
}) {
  const { state, topPosts, windowStart, windowEnd } = popularity;
  const max = topPosts[0]?.views ?? 0;
  const window =
    windowStart !== null && windowEnd !== null
      ? formatWindow(windowStart, windowEnd)
      : undefined;

  return (
    <section className={cn("dashboard-section dashboard-popular", className)}>
      <SectionHeading
        size="md"
        title={m.dashboard_popular_title()}
        description={window}
      />
      {state === "unconfigured" ? (
        <EmptyState
          size="compact"
          icon={ChartNoAxesColumn}
          title={m.dashboard_popular_unconfigured_title()}
          description={m.dashboard_popular_unconfigured_desc()}
        />
      ) : state === "missing" ? (
        <EmptyState
          size="compact"
          icon={ChartNoAxesColumn}
          title={m.dashboard_popular_missing_title()}
          description={m.dashboard_popular_missing_desc()}
          action={
            <Link
              from="/"
              to="/admin/settings/maintenance"
              className={buttonClass({ variant: "text", size: "sm" })}
            >
              {m.dashboard_popular_sync()}
              <ArrowRight size={16} />
            </Link>
          }
        />
      ) : topPosts.length === 0 ? (
        <EmptyState
          size="compact"
          icon={ChartNoAxesColumn}
          description={m.dashboard_popular_no_views()}
        />
      ) : (
        <RankedBarList aria-label={m.dashboard_popular_title()}>
          {topPosts.map((post, index) => (
            <RankedBarRow
              key={post.id}
              rank={index + 1}
              value={post.views}
              max={max}
              valueText={m.post_views_count({ count: post.views })}
              title={
                <Link
                  to="/admin/posts/edit/$id"
                  params={{ id: String(post.id) }}
                  title={post.title}
                >
                  {post.title.trim() || m.common_untitled()}
                </Link>
              }
              action={
                <Link
                  to="/post/$slug"
                  params={{ slug: post.slug }}
                  target="_blank"
                  rel="noopener"
                  aria-label={m.dashboard_popular_open_public()}
                  title={m.dashboard_popular_open_public()}
                  className={iconButtonClass({ size: "sm" })}
                >
                  <ExternalLink size={16} />
                </Link>
              }
            />
          ))}
        </RankedBarList>
      )}
    </section>
  );
}
