// PROTOTYPE (throwaway): the Admin redesign, round 3. Never merge.
import { type PointerEvent, useLayoutEffect, useRef, useState } from "react";
import { formatCount } from "../format";

export interface TrendPoint {
  /** UTC midnight, in milliseconds. */
  day: number;
  views: number;
}

const DAY_MS = 86_400_000;

/**
 * STUB: the snapshot holds the window's total only. Until a daily series is
 * stored, this spreads the total over the window with a weekly rhythm, the
 * same way for the same total.
 */
export function stubDailySeries(
  total: number,
  start: number,
  end: number,
): Array<TrendPoint> {
  const days = Math.max(2, Math.round((end - start) / DAY_MS) + 1);
  let seed = (total * 2654435761) >>> 0 || 1;
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const spike = Math.floor(random() * (days - 6)) + 3;
  const weights = Array.from({ length: days }, (_, index) => {
    const weekday = new Date(start + index * DAY_MS).getUTCDay();
    const rhythm = weekday === 0 || weekday === 6 ? 0.72 : 1;
    const drift = 0.85 + 0.3 * Math.sin((index / days) * Math.PI * 1.6);
    const bump =
      index === spike ? 2.3 : Math.abs(index - spike) === 1 ? 1.45 : 1;
    return rhythm * drift * bump * (0.75 + random() * 0.5);
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  const views = weights.map((weight) => Math.round((weight / sum) * total));
  const rest = total - views.reduce((a, b) => a + b, 0);
  const peak = views.indexOf(Math.max(...views));
  views[peak] = Math.max(0, (views[peak] ?? 0) + rest);
  return views.map((value, index) => ({
    day: start + index * DAY_MS,
    views: value,
  }));
}

function niceMax(value: number) {
  if (value <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10])
    if (value <= step * power) return step * power;
  return 10 * power;
}

/** A monotone cubic through the points: smooth, and never past a value. */
function smoothPath(points: Array<[number, number]>) {
  const n = points.length;
  if (n < 2) return "";
  const dx: Array<number> = [];
  const slope: Array<number> = [];
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    dx.push(x1 - x0);
    slope.push((y1 - y0) / (x1 - x0));
  }
  const tangent = [slope[0]!];
  for (let i = 1; i < n - 1; i++) {
    const a = slope[i - 1]!;
    const b = slope[i]!;
    tangent.push(a * b <= 0 ? 0 : (2 * a * b) / (a + b));
  }
  tangent.push(slope[n - 2]!);
  let d = `M${points[0]![0]},${points[0]![1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    const third = dx[i]! / 3;
    d += `C${x0 + third},${y0 + tangent[i]! * third} ${x1 - third},${y1 - tangent[i + 1]! * third} ${x1},${y1}`;
  }
  return d;
}

const dayFormat = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
  timeZone: "UTC",
});
const tipFormat = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric",
  weekday: "short",
  timeZone: "UTC",
});

const HEIGHT = 208;
const PAD = { top: 16, right: 12, bottom: 26, left: 12 };

/** Views per day as an area: it draws itself in, and reads out the day under the pointer. */
export function TrendChart({ series }: { series: Array<TrendPoint> }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => setWidth(Math.floor(box.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const max = niceMax(Math.max(...series.map((point) => point.views)));
  const innerW = Math.max(width - PAD.left - PAD.right, 1);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const step = innerW / (series.length - 1);
  const x = (index: number) => PAD.left + index * step;
  const y = (views: number) => PAD.top + (1 - views / max) * innerH;
  const points = series.map(
    (point, index) => [x(index), y(point.views)] as [number, number],
  );
  const line = smoothPath(points);
  const floor = PAD.top + innerH;
  const area = `${line}L${x(series.length - 1)},${floor}L${x(0)},${floor}Z`;
  const last = points.at(-1)!;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((share) =>
    Math.round(share * (series.length - 1)),
  );

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const index = Math.round((event.clientX - box.left - PAD.left) / step);
    setHover(Math.min(series.length - 1, Math.max(0, index)));
  };
  const focus = hover === null ? null : series[hover]!;

  return (
    <div ref={boxRef} className="so-chart">
      {width > 0 ? (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="近 30 天每日访问"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="so-area" x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0"
                stopColor="var(--admin-accent)"
                stopOpacity="0.26"
              />
              <stop
                offset="1"
                stopColor="var(--admin-accent)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          {[0.5, 1].map((share) => (
            <g key={share}>
              <line
                className="so-chart-grid"
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(max * share)}
                y2={y(max * share)}
              />
              <text
                className="so-chart-tick"
                x={PAD.left}
                y={y(max * share) - 6}
              >
                {formatCount(max * share)}
              </text>
            </g>
          ))}
          <line
            className="so-chart-base"
            x1={PAD.left}
            x2={width - PAD.right}
            y1={floor}
            y2={floor}
          />
          <path className="so-chart-area" d={area} fill="url(#so-area)" />
          <path className="so-chart-line" d={line} pathLength={1} />
          {ticks.map((index, order) => (
            <text
              key={index}
              className="so-chart-tick"
              x={x(index)}
              y={HEIGHT - 6}
              textAnchor={
                order === 0
                  ? "start"
                  : order === ticks.length - 1
                    ? "end"
                    : "middle"
              }
            >
              {dayFormat.format(series[index]!.day)}
            </text>
          ))}
          {hover === null ? (
            <g className="so-chart-now">
              <circle cx={last[0]} cy={last[1]} r="9" />
              <circle cx={last[0]} cy={last[1]} r="3.5" />
            </g>
          ) : (
            <g>
              <line
                className="so-chart-cursor"
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={floor}
              />
              <circle
                className="so-chart-dot"
                cx={x(hover)}
                cy={y(focus!.views)}
                r="4.5"
              />
            </g>
          )}
        </svg>
      ) : null}
      {focus && hover !== null ? (
        <div
          className="so-chart-tip"
          style={{
            left: Math.min(Math.max(x(hover), 64), width - 64),
            top: y(focus.views),
          }}
        >
          <b>{formatCount(focus.views)}</b>
          <span>{tipFormat.format(focus.day)}</span>
        </div>
      ) : null}
    </div>
  );
}
