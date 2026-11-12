import { Link } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";
import { useMemo } from "react";
import { riseOrder } from "@/components/admin/rise";
import { Button, buttonClass } from "@/components/ui/button";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import { useCreatePost } from "@/features/posts/components/post-manager/hooks/use-create-post";
import { formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { formatCount, formatWeekdayNarrow } from "./format";

const HOUR_MS = 3_600_000;

/**
 * The next thing to write, on the dark card: the latest draft to continue,
 * or a prompt to start one; beside it, the writing of the last seven days.
 * A soft light follows the pointer across the card.
 */
export function OverviewHero({ data }: { data: DashboardOverview }) {
  const create = useCreatePost();
  const draft = data.latestDraft;
  const others = data.stats.draftPosts - (draft ? 1 : 0);

  return (
    <section
      className="overview-hero admin-rise"
      style={riseOrder(1)}
      onPointerMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty(
          "--mx",
          `${event.clientX - box.left}px`,
        );
        event.currentTarget.style.setProperty(
          "--my",
          `${event.clientY - box.top}px`,
        );
      }}
    >
      <span className="overview-hero-glow" />
      <span className="overview-hero-spot" />
      <span className="overview-hero-glow is-b" />
      <span className="overview-hero-grain" />
      <div className="overview-hero-main">
        <p className="overview-eyebrow">
          <i />
          {draft
            ? m.admin_overview_hero_continue()
            : m.admin_overview_hero_start()}
        </p>
        <h2 className="overview-hero-title">
          {draft
            ? draft.title.trim() || m.common_untitled()
            : m.admin_overview_hero_prompt()}
        </h2>
        <p className="overview-hero-meta">
          {draft
            ? [
                m.admin_posts_status_draft(),
                m.admin_overview_hero_edited({
                  time: formatTimeAgo(draft.updatedAt),
                }),
                others > 0
                  ? m.admin_overview_hero_other_drafts({ count: others })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : m.admin_overview_hero_published({
                count: formatCount(data.stats.publishedPosts),
              })}
        </p>
        <div className="overview-hero-actions">
          {draft ? (
            <Link
              className={buttonClass({ variant: "inverse", size: "md" })}
              to="/admin/posts/edit/$id"
              params={{ id: String(draft.id) }}
            >
              {m.dashboard_continue_writing()}
              <ArrowRight size={16} aria-hidden />
            </Link>
          ) : null}
          <Button
            variant={draft ? "glass" : "inverse"}
            size="md"
            icon={<Plus size={16} />}
            disabled={create.isPending}
            onClick={() => create.mutate()}
          >
            {m.admin_posts_create()}
          </Button>
        </div>
      </div>
      <WeekBars activity={data.writingActivity} />
    </section>
  );
}

/** One bar per local day of the last seven, today in the accent. */
function WeekBars({
  activity,
}: {
  activity: DashboardOverview["writingActivity"];
}) {
  const days = useMemo(() => {
    const today = new Date();
    const counts = new Map<string, number>();
    for (const { hour, count } of activity) {
      const key = new Date(hour * HOUR_MS).toDateString();
      counts.set(key, (counts.get(key) ?? 0) + count);
    }
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 6 + index,
      );
      return {
        key: date.getTime(),
        name: formatWeekdayNarrow(date),
        count: counts.get(date.toDateString()) ?? 0,
        today: index === 6,
      };
    });
  }, [activity]);
  const max = Math.max(1, ...days.map((day) => day.count));
  const active = days.filter((day) => day.count > 0).length;
  // The count is bold inside the sentence.
  const [before, after] = m
    .admin_overview_week_label({ count: "\u0000" })
    .split("\u0000");

  return (
    <div
      className="overview-week"
      role="img"
      aria-label={m.admin_overview_week_aria({ count: active })}
    >
      <p className="overview-week-label" aria-hidden>
        {before}
        <b>{active}</b>
        {after}
      </p>
      <div className="overview-week-bars" aria-hidden>
        {days.map((day, index) => (
          <span
            key={day.key}
            className="overview-week-day"
            data-on={day.count > 0 ? "" : undefined}
            data-today={day.today ? "" : undefined}
          >
            <i
              className="overview-week-bar"
              style={{ "--v": day.count / max, "--i": index } as object}
            />
            {day.name}
          </span>
        ))}
      </div>
    </div>
  );
}
