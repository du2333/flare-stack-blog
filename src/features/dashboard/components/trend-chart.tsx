import {
  type PointerEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { formatCount, formatUtcDay, formatUtcDayLong } from "./format";

export interface TrendPoint {
  /** UTC midnight, in milliseconds. */
  day: number;
  views: number;
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

const HEIGHT = 208;
const PAD = { top: 16, right: 12, bottom: 26, left: 12 };

/**
 * Views per day as an area: it draws itself in, and reads out the day under
 * the pointer. Takes a series of two days or more.
 */
export function TrendChart({
  series,
  label,
}: {
  series: Array<TrendPoint>;
  /** Names the chart for assistive tech. */
  label: string;
}) {
  const gradientId = `trend-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
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
    <div ref={boxRef} className="trend-chart">
      {width > 0 ? (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={label}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
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
                className="trend-chart-grid"
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(max * share)}
                y2={y(max * share)}
              />
              <text
                className="trend-chart-tick"
                x={PAD.left}
                y={y(max * share) - 6}
              >
                {formatCount(max * share)}
              </text>
            </g>
          ))}
          <line
            className="trend-chart-base"
            x1={PAD.left}
            x2={width - PAD.right}
            y1={floor}
            y2={floor}
          />
          <path
            className="trend-chart-area"
            d={area}
            fill={`url(#${gradientId})`}
          />
          <path className="trend-chart-line" d={line} pathLength={1} />
          {ticks.map((index, order) => (
            <text
              key={index}
              className="trend-chart-tick"
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
              {formatUtcDay(series[index]!.day)}
            </text>
          ))}
          {hover === null ? (
            <g className="trend-chart-now">
              <circle cx={last[0]} cy={last[1]} r="9" />
              <circle cx={last[0]} cy={last[1]} r="3.5" />
            </g>
          ) : (
            <g>
              <line
                className="trend-chart-cursor"
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={floor}
              />
              <circle
                className="trend-chart-dot"
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
          className="trend-chart-tip"
          style={{
            left: Math.min(Math.max(x(hover), 64), width - 64),
            top: y(focus.views),
          }}
        >
          <b>{formatCount(focus.views)}</b>
          <span>{formatUtcDayLong(focus.day)}</span>
        </div>
      ) : null}
    </div>
  );
}
