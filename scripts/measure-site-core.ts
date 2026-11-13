/**
 * The parts of scripts/measure-site.ts that need no browser: reading a
 * Lighthouse report, median and spread, what makes two rounds comparable, the
 * refusal rule, the comparison of two saved rounds and the table.
 */

export const METRICS = [
  { key: "fcp", label: "FCP (ms)", kind: "time" },
  { key: "lcp", label: "LCP (ms)", kind: "time" },
  { key: "tbt", label: "TBT (ms)", kind: "time" },
  { key: "cls", label: "CLS", kind: "cls" },
  { key: "speedIndex", label: "Speed Index (ms)", kind: "time" },
  { key: "score", label: "Performance score", kind: "score" },
  { key: "jsBytes", label: "JS transfer (KB)", kind: "bytes" },
  { key: "requests", label: "Requests", kind: "count" },
  { key: "unusedJsBytes", label: "Unused JS (KB)", kind: "bytes" },
] as const;

export type MetricKey = (typeof METRICS)[number]["key"];
type MetricKind = (typeof METRICS)[number]["kind"];

/** One Lighthouse run, reduced to what a round compares. Times are milliseconds. */
export type RunMetrics = Record<MetricKey, number> & {
  /** Lighthouse's CPU benchmark; a run on a busier or slower machine scores lower. */
  benchmarkIndex: number;
};

export type Stats = { median: number; min: number; max: number };

export type PageFingerprint = {
  /** `data-theme` on `<html>`, or null when the page sets none. */
  theme: string | null;
  modulepreloads: number;
};

export type UrlResult = PageFingerprint & {
  url: string;
  runs: Array<RunMetrics>;
  failures: number;
  stats: Record<MetricKey, Stats>;
};

export type Round = {
  version: 1;
  savedAt: string;
  tool: {
    lighthouse: string;
    chrome: string;
    preset: "mobile";
    throttlingMethod: string;
  };
  machine: {
    cpus: number;
    load1Start: number;
    load1End: number;
    benchmarkIndex: number;
  };
  results: Array<UrlResult>;
};

/** Mean of the two middle values for an even count. Throws on an empty list. */
export function median(values: ReadonlyArray<number>) {
  if (values.length === 0) throw new Error("median of no values");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function spread(values: ReadonlyArray<number>): Stats {
  return {
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function summarize(runs: ReadonlyArray<RunMetrics>) {
  return Object.fromEntries(
    METRICS.map(({ key }) => [key, spread(runs.map((run) => run[key]))]),
  ) as Record<MetricKey, Stats>;
}

type Audit = {
  numericValue?: number;
  details?: { items?: Array<Record<string, unknown>> };
};

/** The slice of a Lighthouse JSON report this tool reads. */
export type LighthouseReport = {
  lighthouseVersion: string;
  environment: { hostUserAgent: string; benchmarkIndex: number };
  categories: { performance: { score: number | null } };
  audits: Record<string, Audit | undefined>;
  runtimeError?: { code: string; message: string };
};

export function runMetricsFrom(report: LighthouseReport): RunMetrics {
  if (report.runtimeError) {
    throw new Error(
      `${report.runtimeError.code}: ${report.runtimeError.message}`,
    );
  }
  const numeric = (id: string) => {
    const value = report.audits[id]?.numericValue;
    if (typeof value !== "number") {
      throw new Error(`the report has no numeric value for audit ${id}`);
    }
    return value;
  };
  const summary = report.audits["resource-summary"]?.details?.items ?? [];
  const row = (type: string) =>
    summary.find((item) => item.resourceType === type);
  const score = report.categories.performance.score;
  if (score === null) throw new Error("the report has no performance score");
  return {
    fcp: numeric("first-contentful-paint"),
    lcp: numeric("largest-contentful-paint"),
    tbt: numeric("total-blocking-time"),
    cls: numeric("cumulative-layout-shift"),
    speedIndex: numeric("speed-index"),
    score: score * 100,
    jsBytes: Number(row("script")?.transferSize ?? 0),
    requests: Number(row("total")?.requestCount ?? 0),
    // The audit lists only scripts above Lighthouse's own size floor, so this
    // is a lower bound; it is comparable between rounds, not an exact total.
    unusedJsBytes: Number(
      (
        report.audits["unused-javascript"] as
          | { details?: { overallSavingsBytes?: number } }
          | undefined
      )?.details?.overallSavingsBytes ?? 0,
    ),
    benchmarkIndex: report.environment.benchmarkIndex,
  };
}

/** What two rounds must share to be comparable, read from the page's HTML. */
export function fingerprintOf(html: string): PageFingerprint {
  const htmlTag = /<html\b[^>]*>/i.exec(html)?.[0] ?? "";
  const theme = /\sdata-theme="([^"]*)"/i.exec(htmlTag)?.[1] ?? null;
  const modulepreloads = (
    html.match(/<link\b[^>]*\brel="modulepreload"[^>]*>/gi) ?? []
  ).length;
  return { theme, modulepreloads };
}

export type MachineState = {
  /** A heavy.sh run (or another flock holder) has the machine-wide lock. */
  lockHeld: boolean;
  /** The note heavy.sh leaves, when there is one. */
  holder?: string;
  /** This process runs inside heavy.sh, so the lock is its own. */
  holdsLockItself: boolean;
  load1: number;
  maxLoad: number;
  force: boolean;
};

/** Why a measurement must not start, or undefined when it may. */
export function refusalReason(state: MachineState): string | undefined {
  if (state.force) return undefined;
  if (state.lockHeld && !state.holdsLockItself) {
    return `the machine-wide heavy lock is held by: ${state.holder || "an unknown process"}. Wait for it, or run this under \`bun run heavy -- bun scripts/measure-site.ts ...\` to queue, or pass --force.`;
  }
  if (state.load1 > state.maxLoad) {
    return `the 1-minute load average is ${state.load1.toFixed(2)}, above ${state.maxLoad}. Something else is using the machine; wait, or pass --force / --max-load.`;
  }
  return undefined;
}

export type Difference = {
  url: string;
  rows: Array<{
    metric: (typeof METRICS)[number];
    before: number;
    after: number;
    delta: number;
    /** Percent of `before`; null when `before` is 0. */
    percent: number | null;
  }>;
};

export type Comparison = {
  differences: Array<Difference>;
  warnings: Array<string>;
  /** URLs present in only one of the two rounds. */
  unmatched: Array<string>;
};

export function compareRounds(before: Round, after: Round): Comparison {
  const warnings: Array<string> = [];
  const differences: Array<Difference> = [];
  const unmatched: Array<string> = [];

  if (before.tool.throttlingMethod !== after.tool.throttlingMethod) {
    warnings.push(
      `Throttling differs: ${before.tool.throttlingMethod} before, ${after.tool.throttlingMethod} after. The numbers are not comparable.`,
    );
  }
  if (before.tool.lighthouse !== after.tool.lighthouse) {
    warnings.push(
      `Lighthouse differs: ${before.tool.lighthouse} before, ${after.tool.lighthouse} after.`,
    );
  }
  if (before.tool.preset !== after.tool.preset) {
    warnings.push("The device preset differs.");
  }

  for (const now of after.results) {
    const earlier = before.results.find((r) => r.url === now.url);
    if (!earlier) {
      unmatched.push(now.url);
      continue;
    }
    if (earlier.theme !== now.theme) {
      warnings.push(
        `Theme differs on ${now.url}: ${earlier.theme ?? "none"} before, ${now.theme ?? "none"} after. A Theme changes what loads, so this is not a like-for-like comparison.`,
      );
    }
    differences.push({
      url: now.url,
      rows: METRICS.map((metric) => {
        const a = earlier.stats[metric.key].median;
        const b = now.stats[metric.key].median;
        return {
          metric,
          before: a,
          after: b,
          delta: b - a,
          percent: a === 0 ? null : ((b - a) / a) * 100,
        };
      }),
    });
  }
  for (const earlier of before.results) {
    if (!after.results.some((r) => r.url === earlier.url)) {
      unmatched.push(earlier.url);
    }
  }
  return { differences, warnings, unmatched };
}

/** A time metric whose runs scatter by more than a quarter of the median and 100 ms. */
export function isUnstable(stats: Stats, kind: MetricKind) {
  if (kind !== "time") return false;
  const range = stats.max - stats.min;
  return range > 100 && range > stats.median * 0.25;
}

export function formatValue(value: number, kind: MetricKind) {
  switch (kind) {
    case "time":
      return String(Math.round(value));
    case "cls":
      return value.toFixed(3);
    case "score":
      return String(Math.round(value));
    case "bytes":
      return (value / 1024).toFixed(0);
    case "count":
      return String(Math.round(value));
  }
}

function formatCell(stats: Stats, kind: MetricKind) {
  const fmt = (n: number) => formatValue(n, kind);
  const mark = isUnstable(stats, kind) ? " !" : "";
  return `${fmt(stats.median)} (${fmt(stats.min)}-${fmt(stats.max)})${mark}`;
}

function renderRows(rows: Array<Array<string>>) {
  const widths = rows[0]!.map((_, col) =>
    Math.max(...rows.map((row) => row[col]!.length)),
  );
  return rows
    .map((row) =>
      row
        .map((cell, col) => cell.padEnd(widths[col]!))
        .join("  ")
        .trimEnd(),
    )
    .join("\n");
}

/** Metrics down the side, one column per URL; each cell is median (min-max). */
export function renderTable(results: ReadonlyArray<UrlResult>) {
  const header = ["", ...results.map((r) => r.url)];
  const body = METRICS.map((metric) => [
    metric.label,
    ...results.map((r) => formatCell(r.stats[metric.key], metric.kind)),
  ]);
  return renderRows([header, ...body]);
}

/** A magnitude with its sign; one that rounds to zero carries none. */
function signed(value: number, magnitude: string) {
  if (/^[0.]*$/.test(magnitude)) return magnitude;
  return `${value >= 0 ? "+" : "-"}${magnitude}`;
}

export function renderComparison(comparison: Comparison) {
  const blocks = comparison.differences.map((difference) => {
    const rows = difference.rows.map(
      ({ metric, before, after, delta, percent }) => [
        metric.label,
        formatValue(before, metric.kind),
        formatValue(after, metric.kind),
        signed(delta, formatValue(Math.abs(delta), metric.kind)),
        percent === null
          ? ""
          : signed(percent, Math.abs(percent).toFixed(1)) + "%",
      ],
    );
    return `${difference.url}\n${renderRows([["", "before", "after", "change", ""], ...rows])}`;
  });
  return blocks.join("\n\n");
}

/** The lines printed (and stored) before a round: what makes two rounds comparable. */
export function comparabilityLines(args: {
  results: ReadonlyArray<PageFingerprint & { url: string }>;
  load1: number;
  cpus: number;
  throttlingMethod: string;
}) {
  return [
    `Load average (1 min): ${args.load1.toFixed(2)} on ${args.cpus} CPUs`,
    `Throttling: mobile preset, ${args.throttlingMethod}`,
    ...args.results.map(
      (r) =>
        `${r.url}  Theme: ${r.theme ?? "none"}  modulepreload links: ${r.modulepreloads}`,
    ),
  ];
}
