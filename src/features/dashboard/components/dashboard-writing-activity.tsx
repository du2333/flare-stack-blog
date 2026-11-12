import { type PointerEvent, useMemo, useRef, useState } from "react";
import { SectionHeading } from "@/components/ui/page-heading";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import {
  buildWritingCalendar,
  type WritingDay,
  type WritingLevel,
} from "@/features/dashboard/writing-calendar";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { formatDay, formatMonth } from "./format";
import "./writing-heatmap.css";

/** Room kept either side of the tip, so the box's edge does not cut it. */
const TIP_HALF_WIDTH = 84;
const LEVELS: Array<WritingLevel> = [0, 1, 2, 3, 4];
/** Monday, Wednesday and Friday label rows 1, 3 and 5. */
const LABELLED_ROWS = [0, 2, 4];

function dayLabel(day: WritingDay) {
  const date = formatDay(day.date);
  return day.count > 0
    ? m.dashboard_writing_day({ date, count: day.count })
    : m.dashboard_writing_day_none({ date });
}

function weekdayNames(firstWeek: Array<WritingDay>) {
  const format = new Intl.DateTimeFormat(
    getLocale() === "zh" ? "zh-CN" : "en-US",
    { weekday: "narrow" },
  );
  return firstWeek.map((day) => format.format(day.date));
}

/**
 * A calendar of the last half year: one cell per local day, darker the more
 * the Admin wrote that day. Every cell is labelled with its date and count.
 */
export function DashboardWritingActivity({
  activity,
  className,
}: {
  activity: DashboardOverview["writingActivity"];
  className?: string;
}) {
  const calendar = useMemo(
    () => buildWritingCalendar(activity, new Date()),
    [activity],
  );
  const frameRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const summary =
    calendar.activeDays > 0
      ? [
          m.dashboard_writing_days({ count: calendar.activeDays }),
          m.dashboard_writing_streak({ count: calendar.longestStreak }),
        ].join(" · ")
      : m.dashboard_writing_none();
  const weekdays = weekdayNames(calendar.weeks[0] ?? []);
  const months = calendar.months.filter(
    (month, index, all) =>
      index === 0 || month.week - (all[index - 1]?.week ?? 0) >= 3,
  );
  if (months[0] && months[0].week >= 3) {
    const first = calendar.weeks[0]?.[0];
    if (first) months.unshift({ week: 0, date: first.date });
  }

  const showTip = (event: PointerEvent<HTMLDivElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-label]",
    );
    const frame = frameRef.current;
    if (!cell || !frame) return setTip(null);
    const cellBox = cell.getBoundingClientRect();
    const frameBox = frame.getBoundingClientRect();
    // Keep the tip inside the scrolling box, which would cut it off.
    const x = cellBox.left + cellBox.width / 2 - frameBox.left;
    setTip({
      text: cell.dataset.label ?? "",
      x: Math.min(Math.max(x, TIP_HALF_WIDTH), frameBox.width - TIP_HALF_WIDTH),
      y: cellBox.top - frameBox.top,
    });
  };

  return (
    <section className={cn("dashboard-section dashboard-activity", className)}>
      <SectionHeading
        size="md"
        title={m.dashboard_writing_title()}
        description={summary}
      />
      <div className="writing-heatmap-scroll custom-scrollbar">
        <div
          ref={frameRef}
          className="writing-heatmap"
          style={{ "--writing-weeks": calendar.weeks.length } as object}
        >
          <div className="writing-heatmap-months" aria-hidden="true">
            {months.map((month) => (
              <span
                key={month.week}
                style={{ gridColumnStart: month.week + 1 }}
              >
                {formatMonth(month.date)}
              </span>
            ))}
          </div>
          <div className="writing-heatmap-weekdays" aria-hidden="true">
            {weekdays.map((name, row) => (
              <span key={row}>{LABELLED_ROWS.includes(row) ? name : ""}</span>
            ))}
          </div>
          <div
            role="group"
            aria-label={summary}
            className="writing-heatmap-grid"
            onPointerOver={showTip}
            onPointerLeave={() => setTip(null)}
          >
            {calendar.weeks
              .flat()
              .map((day) =>
                day.future ? (
                  <span
                    key={day.date.getTime()}
                    className="writing-heatmap-cell"
                    data-future=""
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    key={day.date.getTime()}
                    role="img"
                    aria-label={dayLabel(day)}
                    data-label={dayLabel(day)}
                    data-level={day.level}
                    className="writing-heatmap-cell"
                  />
                ),
              )}
          </div>
          {tip ? (
            <div
              className="writing-heatmap-tip"
              aria-hidden="true"
              style={{ left: tip.x, top: tip.y }}
            >
              {tip.text}
            </div>
          ) : null}
        </div>
      </div>
      <div className="writing-heatmap-foot">
        <p>{m.dashboard_writing_basis()}</p>
        <div className="writing-heatmap-legend" aria-hidden="true">
          <span>{m.dashboard_writing_less()}</span>
          {LEVELS.map((level) => (
            <span
              key={level}
              className="writing-heatmap-cell"
              data-level={level}
            />
          ))}
          <span>{m.dashboard_writing_more()}</span>
        </div>
      </div>
    </section>
  );
}
