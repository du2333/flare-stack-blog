import { describe, expect, it } from "vitest";
import {
  METRICS,
  compareRounds,
  fingerprintOf,
  isUnstable,
  median,
  refusalReason,
  renderComparison,
  renderTable,
  runMetricsFrom,
  spread,
  summarize,
  type LighthouseReport,
  type MachineState,
  type Round,
  type RunMetrics,
  type UrlResult,
} from "./measure-site-core.ts";

function run(overrides: Partial<RunMetrics> = {}): RunMetrics {
  return {
    fcp: 1200,
    lcp: 2000,
    tbt: 100,
    cls: 0,
    speedIndex: 2000,
    score: 90,
    jsBytes: 300 * 1024,
    requests: 50,
    unusedJsBytes: 100 * 1024,
    benchmarkIndex: 2800,
    ...overrides,
  };
}

function result(
  overrides: Partial<UrlResult> & { runs?: Array<RunMetrics> } = {},
): UrlResult {
  const runs = overrides.runs ?? [run()];
  return {
    url: "https://example.test/",
    theme: "immersive",
    modulepreloads: 19,
    failures: 0,
    stats: summarize(runs),
    ...overrides,
    runs,
  };
}

function round(
  results: Array<UrlResult>,
  tool: Partial<Round["tool"]> = {},
): Round {
  return {
    version: 1,
    savedAt: "2026-11-13T00:00:00.000Z",
    tool: {
      lighthouse: "13.6.0",
      chrome: "153",
      preset: "mobile",
      throttlingMethod: "simulate",
      ...tool,
    },
    machine: { cpus: 16, load1Start: 0.5, load1End: 0.6, benchmarkIndex: 2800 },
    results,
  };
}

describe("median and spread", () => {
  it("takes the middle value of an odd count and the mean of the middle two otherwise", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([7])).toBe(7);
  });

  it("does not reorder its input", () => {
    const values = [3, 1, 2];
    median(values);
    expect(values).toEqual([3, 1, 2]);
  });

  it("refuses an empty list", () => {
    expect(() => median([])).toThrow();
  });

  it("reports min and max beside the median", () => {
    expect(spread([1200, 1000, 1500])).toEqual({
      median: 1200,
      min: 1000,
      max: 1500,
    });
  });

  it("summarizes every metric", () => {
    const stats = summarize([
      run({ fcp: 1000 }),
      run({ fcp: 1400 }),
      run({ fcp: 1200 }),
    ]);
    expect(stats.fcp).toEqual({ median: 1200, min: 1000, max: 1400 });
    expect(Object.keys(stats)).toEqual(METRICS.map((m) => m.key));
  });
});

describe("isUnstable", () => {
  it("flags a time metric that scatters by more than a quarter and 100 ms", () => {
    expect(isUnstable({ median: 1000, min: 700, max: 1100 }, "time")).toBe(
      true,
    );
  });

  it("leaves a tight spread, a small absolute one and non-time metrics alone", () => {
    expect(isUnstable({ median: 1000, min: 950, max: 1050 }, "time")).toBe(
      false,
    );
    expect(isUnstable({ median: 20, min: 5, max: 60 }, "time")).toBe(false);
    expect(isUnstable({ median: 0.1, min: 0, max: 0.5 }, "cls")).toBe(false);
  });
});

describe("runMetricsFrom", () => {
  const report: LighthouseReport = {
    lighthouseVersion: "13.6.0",
    environment: { hostUserAgent: "HeadlessChrome/153", benchmarkIndex: 2832 },
    categories: { performance: { score: 0.89 } },
    audits: {
      "first-contentful-paint": { numericValue: 1258.2 },
      "largest-contentful-paint": { numericValue: 3658.2 },
      "total-blocking-time": { numericValue: 22 },
      "cumulative-layout-shift": { numericValue: 0 },
      "speed-index": { numericValue: 2637.9 },
      "resource-summary": {
        details: {
          items: [
            { resourceType: "total", requestCount: 53, transferSize: 522776 },
            { resourceType: "script", requestCount: 24, transferSize: 297244 },
          ],
        },
      },
      "unused-javascript": {
        details: { overallSavingsBytes: 114000, items: [] },
      } as never,
    },
  };

  it("reads the metrics, the script transfer and the score as a percentage", () => {
    expect(runMetricsFrom(report)).toMatchObject({
      fcp: 1258.2,
      lcp: 3658.2,
      tbt: 22,
      speedIndex: 2637.9,
      score: 89,
      jsBytes: 297244,
      requests: 53,
      unusedJsBytes: 114000,
      benchmarkIndex: 2832,
    });
  });

  it("throws on a run Lighthouse itself marked as failed", () => {
    expect(() =>
      runMetricsFrom({
        ...report,
        runtimeError: { code: "NO_FCP", message: "The page did not paint" },
      }),
    ).toThrow(/NO_FCP/);
  });

  it("throws when a metric is missing instead of reporting zero", () => {
    const { "speed-index": _, ...audits } = report.audits;
    expect(() => runMetricsFrom({ ...report, audits })).toThrow(/speed-index/);
  });
});

describe("fingerprintOf", () => {
  it("reads the Theme from <html> and counts modulepreload links", () => {
    const html =
      '<!DOCTYPE html><html lang="zh" data-theme="immersive" style="--x:1"><head>' +
      '<link rel="stylesheet" href="/a.css"/>' +
      '<link rel="modulepreload" href="/a.js" fetchPriority="low"/>' +
      '<link rel="modulepreload" href="/b.js"/></head><body data-theme="other"></body></html>';
    expect(fingerprintOf(html)).toEqual({
      theme: "immersive",
      modulepreloads: 2,
    });
  });

  it("reports no Theme when <html> sets none", () => {
    expect(fingerprintOf("<html lang=en><body></body></html>")).toEqual({
      theme: null,
      modulepreloads: 0,
    });
  });
});

describe("refusalReason", () => {
  const idle: MachineState = {
    lockHeld: false,
    holdsLockItself: false,
    load1: 0.5,
    maxLoad: 2,
    force: false,
  };

  it("lets an idle machine through", () => {
    expect(refusalReason(idle)).toBeUndefined();
  });

  it("refuses while someone else holds the heavy lock and names the holder", () => {
    expect(
      refusalReason({
        ...idle,
        lockHeld: true,
        holder: "bun run check (pid 1)",
      }),
    ).toMatch(/held by: bun run check \(pid 1\)/);
  });

  it("does not refuse for a lock this process holds through heavy.sh", () => {
    expect(
      refusalReason({ ...idle, lockHeld: true, holdsLockItself: true }),
    ).toBeUndefined();
  });

  it("refuses above the load threshold but not at it", () => {
    expect(refusalReason({ ...idle, load1: 2.01 })).toMatch(
      /load average is 2\.01/,
    );
    expect(refusalReason({ ...idle, load1: 2 })).toBeUndefined();
  });

  it("is overridden by force, for the lock and for the load", () => {
    expect(
      refusalReason({ ...idle, lockHeld: true, load1: 9, force: true }),
    ).toBeUndefined();
  });

  it("still refuses on load when this process holds the lock", () => {
    expect(
      refusalReason({
        ...idle,
        lockHeld: true,
        holdsLockItself: true,
        load1: 5,
      }),
    ).toMatch(/load average/);
  });
});

describe("compareRounds", () => {
  it("shows near-zero differences for the same data", () => {
    const a = round([result()]);
    const { differences, warnings } = compareRounds(a, a);
    expect(warnings).toEqual([]);
    expect(differences[0]!.rows.every((row) => row.delta === 0)).toBe(true);
  });

  it("reports the change and its percentage of the earlier median", () => {
    const before = round([result({ runs: [run({ fcp: 2000 })] })]);
    const after = round([result({ runs: [run({ fcp: 1500 })] })]);
    const fcp = compareRounds(before, after).differences[0]!.rows.find(
      (row) => row.metric.key === "fcp",
    )!;
    expect(fcp).toMatchObject({
      before: 2000,
      after: 1500,
      delta: -500,
      percent: -25,
    });
  });

  it("gives no percentage when the earlier value is zero", () => {
    const before = round([result({ runs: [run({ cls: 0 })] })]);
    const after = round([result({ runs: [run({ cls: 0.2 })] })]);
    const cls = compareRounds(before, after).differences[0]!.rows.find(
      (row) => row.metric.key === "cls",
    )!;
    expect(cls.percent).toBeNull();
  });

  it("warns when the Themes differ", () => {
    const before = round([result({ theme: "immersive" })]);
    const after = round([result({ theme: "fuwari" })]);
    expect(compareRounds(before, after).warnings.join("\n")).toMatch(
      /Theme differs on https:\/\/example\.test\/: immersive before, fuwari after/,
    );
  });

  it("warns when the throttling method or Lighthouse version differs", () => {
    const warnings = compareRounds(
      round([result()]),
      round([result()], { throttlingMethod: "devtools", lighthouse: "13.7.0" }),
    ).warnings.join("\n");
    expect(warnings).toMatch(/Throttling differs/);
    expect(warnings).toMatch(/Lighthouse differs/);
  });

  it("lists URLs found in only one round instead of comparing them", () => {
    const before = round([result({ url: "https://a.test/" })]);
    const after = round([result({ url: "https://b.test/" })]);
    const comparison = compareRounds(before, after);
    expect(comparison.differences).toEqual([]);
    expect(comparison.unmatched.sort()).toEqual([
      "https://a.test/",
      "https://b.test/",
    ]);
  });
});

describe("tables", () => {
  it("prints median (min-max) per metric and a column per URL", () => {
    const table = renderTable([
      result({
        runs: [run({ fcp: 1000 }), run({ fcp: 1200 }), run({ fcp: 1400 })],
      }),
    ]);
    expect(table).toContain("https://example.test/");
    expect(table).toMatch(/FCP \(ms\)\s+1200 \(1000-1400\)/);
    expect(table).toMatch(/JS transfer \(KB\)\s+300 \(300-300\)/);
  });

  it("marks an unstable metric", () => {
    const table = renderTable([
      result({
        runs: [run({ lcp: 1000 }), run({ lcp: 2500 }), run({ lcp: 1200 })],
      }),
    ]);
    expect(table).toMatch(/LCP \(ms\)\s+1200 \(1000-2500\) !/);
  });

  it("prints a signed change for a comparison", () => {
    const before = round([result({ runs: [run({ fcp: 2000 })] })]);
    const after = round([result({ runs: [run({ fcp: 1500 })] })]);
    expect(renderComparison(compareRounds(before, after))).toMatch(
      /FCP \(ms\)\s+2000\s+1500\s+-500\s+-25\.0%/,
    );
  });

  it("prints no sign on a change that rounds to zero", () => {
    const same = round([result()]);
    expect(renderComparison(compareRounds(same, same))).toMatch(
      /FCP \(ms\)\s+1200\s+1200\s+0\s+0\.0%/,
    );
  });
});
