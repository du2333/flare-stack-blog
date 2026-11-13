import { ClientOnly, useRouteContext } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DASHBOARD_UNREPLIED_COMMENTS_LIMIT } from "@/features/dashboard/dashboard-limits";
import { buildWritingCalendar } from "@/features/dashboard/writing-calendar";
import { m } from "@/paraglide/messages";
import { riseOrder } from "@/components/admin/rise";
import { TimeIcon } from "./overview-card";
import { formatToday } from "./format";
import { greeting } from "./greeting";
import "./overview.css";

/** A card with its real title over rows of placeholders. */
function CardSkeleton({
  title,
  sub,
  i,
  children,
}: {
  title: string;
  sub?: string;
  i: number;
  children: ReactNode;
}) {
  return (
    <section className="overview-card admin-rise" style={riseOrder(i)}>
      <header className="overview-card-head">
        <h2 className="overview-card-title">{title}</h2>
        {sub ? <span className="overview-card-sub">{sub}</span> : null}
      </header>
      {children}
    </section>
  );
}

/**
 * The overview's layout in placeholders: the head, the hero, the views card,
 * the popular Posts and the writing record, and the right column, each at
 * the size the real one takes with a typical site's data. The greeting and
 * the date need the browser's clock (the server's would differ), so they
 * wait for it.
 */
export function DashboardSkeleton() {
  const { session } = useRouteContext({ from: "/admin" });
  const now = new Date();
  const calendar = buildWritingCalendar([], now, 20);
  return (
    <div className="overview-scroll" aria-busy="true">
      <div className="overview">
        <header className="overview-head admin-rise" style={riseOrder(0)}>
          <div>
            <p className="overview-date">
              <ClientOnly fallback={" "}>
                <TimeIcon hour={now.getHours()} />
                {formatToday(now)}
              </ClientOnly>
            </p>
            <h1 className="overview-hello">
              <ClientOnly
                fallback={<Skeleton shimmer className="overview-skel-hello" />}
              >
                {greeting(session.user.name, now.getHours())}
              </ClientOnly>
            </h1>
          </div>
        </header>

        <div className="overview-grid" aria-hidden>
          <div className="overview-col">
            <section className="overview-hero admin-rise" style={riseOrder(1)}>
              <span className="overview-hero-glow" />
              <span className="overview-hero-glow is-b" />
              <div className="overview-hero-main">
                <Skeleton shimmer className="overview-skel-dark is-eyebrow" />
                <Skeleton shimmer className="overview-skel-dark is-title" />
                <Skeleton shimmer className="overview-skel-dark is-meta" />
                <div className="overview-hero-actions">
                  <Skeleton shimmer className="overview-skel-dark is-button" />
                  <Skeleton shimmer className="overview-skel-dark is-button" />
                </div>
              </div>
            </section>

            <section
              className="overview-card overview-pulse admin-rise"
              style={riseOrder(2)}
            >
              <div className="overview-pulse-side">
                <p className="overview-kicker">{m.dashboard_stat_views()}</p>
                <p className="overview-big">
                  <Skeleton shimmer className="overview-skel-big" />
                </p>
                <p className="overview-range">
                  <Skeleton shimmer className="overview-skel-line is-short" />
                </p>
                <div className="overview-minis">
                  {[0, 1, 2].map((row) => (
                    <span key={row} className="overview-mini">
                      <Skeleton shimmer className="overview-skel-line" />
                    </span>
                  ))}
                </div>
              </div>
              <div className="overview-pulse-main">
                <p className="overview-pulse-top">
                  <Skeleton shimmer className="overview-skel-line is-short" />
                </p>
                <div className="trend-chart">
                  <Skeleton shimmer className="overview-skel-chart" />
                </div>
              </div>
            </section>

            <div className="overview-two">
              <CardSkeleton
                title={m.admin_overview_popular_title()}
                sub={m.admin_overview_window_days()}
                i={3}
              >
                <ol className="overview-rank">
                  {[0, 1, 2, 3, 4].map((row) => (
                    <li key={row}>
                      <span className="overview-skel-row">
                        <Skeleton
                          shimmer
                          className="overview-skel-line"
                          style={{ width: `${72 - row * 9}%` }}
                        />
                      </span>
                    </li>
                  ))}
                </ol>
              </CardSkeleton>
              <CardSkeleton
                title={m.dashboard_writing_title()}
                sub={m.admin_overview_half_year()}
                i={4}
              >
                <div className="overview-heat">
                  <div className="overview-heat-facts">
                    {[0, 1, 2].map((fact) => (
                      <p key={fact} className="overview-heat-fact">
                        <b>
                          <Skeleton shimmer className="overview-skel-fact" />
                        </b>
                        <span>
                          <Skeleton
                            shimmer
                            className="overview-skel-line is-tiny"
                          />
                        </span>
                      </p>
                    ))}
                  </div>
                  <div
                    className="overview-heat-wrap"
                    style={{ "--weeks": calendar.weeks.length } as object}
                  >
                    <div className="overview-heat-months" />
                    <div className="overview-heat-grid">
                      {calendar.weeks.flat().map((day) => (
                        <span
                          key={day.date.getTime()}
                          className="overview-heat-cell"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="overview-heat-foot" />
                </div>
              </CardSkeleton>
            </div>
          </div>

          <div className="overview-col">
            <CardSkeleton title={m.dashboard_comments_title()} i={3}>
              <ul className="overview-list">
                {Array.from(
                  { length: DASHBOARD_UNREPLIED_COMMENTS_LIMIT },
                  (_, row) => (
                    <li key={row} className="overview-cmt">
                      <Skeleton shimmer className="overview-face" />
                      <span className="overview-cmt-body overview-skel-stack">
                        <Skeleton
                          shimmer
                          className="overview-skel-line is-short"
                        />
                        <Skeleton shimmer className="overview-skel-line" />
                        <Skeleton
                          shimmer
                          className="overview-skel-line is-mid"
                        />
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </CardSkeleton>
            <CardSkeleton title={m.admin_overview_links_title()} i={4}>
              <ul className="overview-list">
                {[0, 1, 2].map((row) => (
                  <li key={row} className="overview-link">
                    <Skeleton shimmer className="overview-face is-square" />
                    <span className="overview-link-copy overview-skel-stack">
                      <Skeleton
                        shimmer
                        className="overview-skel-line is-short"
                      />
                      <Skeleton
                        shimmer
                        className="overview-skel-line is-tiny"
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </CardSkeleton>
            <CardSkeleton title={m.dashboard_recent_edits()} i={5}>
              <ul className="overview-recent">
                {[0, 1, 2, 3, 4].map((row) => (
                  <li key={row}>
                    <span className="overview-skel-row is-recent">
                      <Skeleton
                        shimmer
                        className="overview-skel-line"
                        style={{ width: `${78 - row * 8}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </CardSkeleton>
          </div>
        </div>
      </div>
    </div>
  );
}
