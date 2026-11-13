import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useRouteContext } from "@tanstack/react-router";
import {
  ChevronRight,
  FileText,
  Link2,
  MessageSquare,
  Pin,
} from "lucide-react";
import {
  type PointerEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import { settingsNotices } from "@/features/dashboard/settings-notices";
import { dashboardOverviewQuery } from "@/features/dashboard/queries";
import { buildWritingCalendar } from "@/features/dashboard/writing-calendar";
import {
  postStateLabel,
  postStateOf,
} from "@/features/posts/components/post-state";
import { formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  formatCount,
  formatDay,
  formatMonth,
  formatToday,
  formatWindow,
} from "./format";
import { greeting } from "./greeting";
import { riseOrder } from "@/components/admin/rise";
import { Count, OverviewCard, TimeIcon } from "./overview-card";
import { OverviewHero } from "./overview-hero";
import { OverviewComments, OverviewFriendLinks } from "./overview-inbox";
import { TrendChart } from "./trend-chart";
import "./overview.css";

/**
 * 「概览」: the greeting with what needs attention beside it; the next thing
 * to write; the views of the window with the site's counts; the popular
 * Posts and the writing record; and on the right what waits for an answer
 * (Comments, Friend Links) and the Posts last edited.
 */
export function OverviewPage() {
  const { data } = useSuspenseQuery({
    ...dashboardOverviewQuery,
    refetchOnMount: "always",
  });
  const { session } = useRouteContext({ from: "/admin" });
  const now = new Date();
  const hour = now.getHours();

  return (
    <div className="overview-scroll">
      <div className="overview">
        <header className="overview-head admin-rise" style={riseOrder(0)}>
          <div>
            <p className="overview-date">
              <TimeIcon hour={hour} />
              {formatToday(now)}
            </p>
            <h1 className="overview-hello">
              {greeting(session.user.name, hour)}
            </h1>
          </div>
          <Notices data={data} />
        </header>

        <div className="overview-grid">
          <div className="overview-col">
            <OverviewHero data={data} />
            <Pulse data={data} />
            <div className="overview-two">
              <Popular popularity={data.popularity} />
              <Writing activity={data.writingActivity} />
            </div>
          </div>
          <div className="overview-col">
            <OverviewComments
              comments={data.unrepliedComments.items}
              total={data.unrepliedComments.total}
            />
            <OverviewFriendLinks pending={data.pendingFriendLinks} />
            <Recent posts={data.recentPosts} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * What needs attention (`settingsNotices`), as small links beside the
 * greeting, each going to where it is fixed; what it means is its tooltip.
 */
function Notices({ data }: { data: DashboardOverview }) {
  const notices = settingsNotices(data);
  if (notices.length === 0) return null;
  return (
    <div className="overview-notices">
      {notices.map((notice) => {
        const body = (
          <>
            <i />
            {notice.title}
            <ChevronRight size={14} aria-hidden />
          </>
        );
        return notice.target.kind === "external" ? (
          <a
            key={notice.key}
            className="overview-notice"
            href={notice.target.href}
            target="_blank"
            rel="noopener noreferrer"
            title={notice.description}
          >
            {body}
          </a>
        ) : (
          <Link
            key={notice.key}
            className="overview-notice"
            to={notice.target.to}
            title={notice.description}
          >
            {body}
          </Link>
        );
      })}
    </div>
  );
}

/* ── Pulse: views of the window, with the site's counts beside ── */

function Pulse({ data }: { data: DashboardOverview }) {
  const { popularity, stats } = data;
  const hasViews =
    popularity.windowStart !== null &&
    popularity.windowEnd !== null &&
    (popularity.state === "ready" || popularity.state === "expired");
  const series = popularity.daily;
  const charted = hasViews && series.length >= 2;
  // With the daily series the total is its sum, so the readings under the
  // pointer add up to it; without, the snapshot's views of the Posts.
  const total = charted
    ? series.reduce((sum, point) => sum + point.views, 0)
    : popularity.totalViews;

  return (
    <section
      className="overview-card overview-pulse admin-rise"
      style={riseOrder(2)}
    >
      <div className="overview-pulse-side">
        <p className="overview-kicker">{m.dashboard_stat_views()}</p>
        <p className="overview-big">
          {hasViews ? <Count value={total} /> : "—"}
        </p>
        <p className="overview-range">
          {hasViews
            ? formatWindow(popularity.windowStart!, popularity.windowEnd!)
            : m.admin_overview_views_unconfigured()}
        </p>
        <div className="overview-minis">
          <Link className="overview-mini" to="/admin/posts">
            <FileText size={15} strokeWidth={1.7} aria-hidden />
            {m.dashboard_stat_posts()}
            {stats.draftPosts > 0 ? (
              <small>
                {m.dashboard_stat_drafts({ count: stats.draftPosts })}
              </small>
            ) : null}
            <b>
              <Count value={stats.publishedPosts} />
            </b>
          </Link>
          <Link className="overview-mini" to="/admin/comments">
            <MessageSquare size={15} strokeWidth={1.7} aria-hidden />
            {m.dashboard_stat_comments()}
            {stats.recentComments > 0 ? (
              <small>
                {m.dashboard_stat_comments_recent({
                  count: stats.recentComments,
                })}
              </small>
            ) : null}
            <b>
              <Count value={stats.comments} />
            </b>
          </Link>
          <Link className="overview-mini" to="/admin/friend-links">
            <Link2 size={15} strokeWidth={1.7} aria-hidden />
            {m.dashboard_stat_friend_links()}
            {stats.pendingFriendLinks > 0 ? (
              <small data-alert>
                {m.dashboard_stat_friend_links_pending({
                  count: stats.pendingFriendLinks,
                })}
              </small>
            ) : null}
            <b>
              <Count value={stats.approvedFriendLinks} />
            </b>
          </Link>
        </div>
      </div>
      <div className="overview-pulse-main">
        {charted ? (
          <>
            <p className="overview-pulse-top">
              <span className="overview-legend">
                <i />
                {m.admin_overview_daily_views()}
              </span>
            </p>
            <TrendChart
              series={series}
              label={m.admin_overview_daily_label()}
            />
          </>
        ) : (
          <>
            {/* The legend's row stays, unseen, so the card keeps its height. */}
            <p
              className="overview-pulse-top"
              aria-hidden
              style={{ visibility: "hidden" }}
            >
              <span className="overview-legend">
                <i />
                {m.admin_overview_daily_views()}
              </span>
            </p>
            <div className="trend-chart">
              <p className="overview-chart-note">
                {hasViews
                  ? m.admin_overview_daily_pending()
                  : m.admin_overview_daily_unconfigured()}
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* ── Popular Posts ── */

function Popular({
  popularity,
}: {
  popularity: DashboardOverview["popularity"];
}) {
  const posts = popularity.topPosts.slice(0, 5);
  const max = Math.max(1, ...posts.map((post) => post.views));
  return (
    <OverviewCard
      title={m.admin_overview_popular_title()}
      sub={m.admin_overview_window_days()}
      i={3}
    >
      {posts.length === 0 ? (
        <PopularEmpty state={popularity.state} />
      ) : (
        <ol className="overview-rank">
          {posts.map((post, index) => (
            <li key={post.id}>
              <Link
                to="/admin/posts/edit/$id"
                params={{ id: String(post.id) }}
                style={{ "--share": post.views / max, "--i": index } as object}
              >
                <span className="overview-rank-no">{index + 1}</span>
                <span className="overview-rank-title">{post.title}</span>
                <span className="overview-rank-views">
                  {formatCount(post.views)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </OverviewCard>
  );
}

/** Why there are no popular Posts: no Umami, no snapshot yet, an expired one, no views. */
function PopularEmpty({
  state,
}: {
  state: DashboardOverview["popularity"]["state"];
}) {
  const [title, description] =
    state === "unconfigured"
      ? [
          m.dashboard_popular_unconfigured_title(),
          m.dashboard_popular_unconfigured_desc(),
        ]
      : state === "missing"
        ? [m.dashboard_popular_missing_title(), null]
        : state === "expired"
          ? [
              m.admin_overview_popularity_expired(),
              m.admin_overview_popularity_expired_desc(),
            ]
          : [m.dashboard_popular_no_views(), null];
  return (
    <p className="overview-empty">
      <b className="overview-empty-title">{title}</b>
      {description ? <span>{description}</span> : null}
    </p>
  );
}

/* ── Writing record ── */

function Writing({
  activity,
}: {
  activity: DashboardOverview["writingActivity"];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [weeks, setWeeks] = useState(20);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(
    null,
  );

  // As many weeks as fit, between ten and the half year.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () =>
      setWeeks(
        Math.min(26, Math.max(10, Math.floor((wrap.clientWidth + 3) / 15.5))),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  const half = useMemo(
    () => buildWritingCalendar(activity, new Date()),
    [activity],
  );
  const calendar = useMemo(
    () => buildWritingCalendar(activity, new Date(), weeks),
    [activity, weeks],
  );
  const months = calendar.months.filter(
    (month, index, all) =>
      index === 0 || month.week - (all[index - 1]?.week ?? 0) >= 3,
  );

  const showTip = (event: PointerEvent<HTMLDivElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-label]",
    );
    const wrap = wrapRef.current;
    if (!cell || !wrap) return setTip(null);
    const box = cell.getBoundingClientRect();
    const frame = wrap.getBoundingClientRect();
    const x = box.left + box.width / 2 - frame.left;
    setTip({
      text: cell.dataset.label ?? "",
      x: Math.min(Math.max(x, 70), frame.width - 70),
      y: box.top - frame.top,
    });
  };

  return (
    <OverviewCard
      title={m.dashboard_writing_title()}
      sub={m.admin_overview_half_year()}
      i={4}
    >
      <div className="overview-heat">
        <div className="overview-heat-facts">
          <p className="overview-heat-fact">
            <b>
              <Count value={half.activeDays} />
              <small>{m.admin_overview_unit_days()}</small>
            </b>
            <span>{m.admin_overview_writing_active()}</span>
          </p>
          <p className="overview-heat-fact">
            <b>
              <Count value={half.longestStreak} />
              <small>{m.admin_overview_unit_days()}</small>
            </b>
            <span>{m.admin_overview_writing_streak()}</span>
          </p>
          <p className="overview-heat-fact">
            <b>
              <Count value={half.total} />
              <small>{m.admin_overview_unit_times()}</small>
            </b>
            <span>{m.admin_overview_writing_saves()}</span>
          </p>
        </div>
        <div
          ref={wrapRef}
          className="overview-heat-wrap"
          style={{ "--weeks": calendar.weeks.length } as object}
        >
          <div className="overview-heat-months" aria-hidden>
            {months.map((month) => (
              <span
                key={month.week}
                style={{ gridColumnStart: month.week + 1 }}
              >
                {formatMonth(month.date)}
              </span>
            ))}
          </div>
          <div
            className="overview-heat-grid"
            onPointerOver={showTip}
            onPointerLeave={() => setTip(null)}
          >
            {calendar.weeks.flat().map((day) => {
              const date = formatDay(day.date);
              const label =
                day.count > 0
                  ? m.admin_overview_writing_day({ date, count: day.count })
                  : m.admin_overview_writing_day_none({ date });
              return day.future ? (
                <span
                  key={day.date.getTime()}
                  className="overview-heat-cell"
                  data-future=""
                />
              ) : (
                <span
                  key={day.date.getTime()}
                  className="overview-heat-cell"
                  role="img"
                  aria-label={label}
                  data-label={label}
                  data-level={day.level}
                />
              );
            })}
          </div>
          {tip ? (
            <div
              className="overview-heat-tip"
              style={{ left: tip.x, top: tip.y }}
            >
              {tip.text}
            </div>
          ) : null}
        </div>
        <div className="overview-heat-foot" aria-hidden>
          {m.dashboard_writing_less()}
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className="overview-heat-cell"
              data-level={level}
            />
          ))}
          {m.dashboard_writing_more()}
        </div>
      </div>
    </OverviewCard>
  );
}

/* ── Posts last edited ── */

function Recent({ posts }: { posts: DashboardOverview["recentPosts"] }) {
  return (
    <OverviewCard
      title={m.dashboard_recent_edits()}
      i={5}
      link={
        <Link className="overview-card-link" to="/admin/posts">
          {m.admin_overview_all_posts()}
          <ChevronRight size={14} aria-hidden />
        </Link>
      }
    >
      {posts.length === 0 ? (
        <p className="overview-empty">{m.admin_posts_empty_title()}</p>
      ) : (
        <ul className="overview-recent">
          {posts.slice(0, 5).map((post) => {
            const state = postStateOf({
              published: post.status === "published",
              hasUnpublishedChanges: post.hasUnpublishedChanges,
            });
            return (
              <li key={post.id}>
                <Link
                  to="/admin/posts/edit/$id"
                  params={{ id: String(post.id) }}
                >
                  <i className="overview-state" data-state={state} />
                  <span className="overview-recent-title">
                    {post.title.trim() || m.common_untitled()}
                  </span>
                  {state === "published" ? null : (
                    <span className="overview-recent-tag">
                      {postStateLabel(state)}
                    </span>
                  )}
                  {post.pinnedAt ? (
                    <Pin
                      size={13}
                      role="img"
                      aria-label={m.admin_posts_pinned()}
                    />
                  ) : null}
                  <time>{formatTimeAgo(post.updatedAt)}</time>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </OverviewCard>
  );
}
