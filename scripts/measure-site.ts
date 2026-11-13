/**
 * Measures how fast a deployed site loads, with Lighthouse's mobile preset:
 *
 *   bun scripts/measure-site.ts <url>... [--runs 5] [--save round.json] [--against earlier.json]
 *
 * Prefer `bun run heavy -- bun scripts/measure-site.ts ...`: the run then holds
 * the machine-wide lock, so no other agent's install or test suite shares the
 * CPU with it. Run on its own, it refuses to start while someone else holds
 * that lock or the 1-minute load average is high (--force overrides).
 *
 * Lighthouse (pinned below, fetched by bunx) drives Chromium through its own
 * debugging port; the Chromium is the headless shell Playwright installed.
 * Each URL is measured `--runs` times, interleaved, and every metric is
 * reported as median (min-max).
 */
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { cpus, homedir, loadavg, tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  compareRounds,
  comparabilityLines,
  fingerprintOf,
  median,
  refusalReason,
  renderComparison,
  renderTable,
  runMetricsFrom,
  summarize,
  type LighthouseReport,
  type Round,
  type RunMetrics,
  type UrlResult,
} from "./measure-site-core.ts";

/** Pinned so two rounds taken months apart score the same way. */
const LIGHTHOUSE_VERSION = "13.6.0";
const HEAVY_LOCK = process.env.HEAVY_LOCK ?? "/tmp/blog-cms-heavy.lock";
const DEFAULT_MAX_LOAD = 2;
const RUN_TIMEOUT_MS = 180_000;

const HELP = `usage: bun scripts/measure-site.ts <url>... [options]

Runs Lighthouse (mobile preset: Moto G Power, slow 4G, 4x CPU slowdown) the
number of times --runs says per URL, interleaved, and prints median (min-max)
per metric.
A "!" marks a time metric whose runs scatter by more than 25% of the median.

  --runs <n>               runs per URL (default 5)
  --throttling <method>    simulate (default; Lighthouse's modelled throttling)
                           or devtools (applied by Chromium: slower, more
                           sensitive to machine load)
  --save <file>            write the round as JSON
  --against <file>         print the difference to a saved round; warns when
                           the Themes (or the throttling) differ
  --max-load <n>           refuse above this 1-minute load average (default ${DEFAULT_MAX_LOAD})
  --force                  measure even though the heavy lock is held or the
                           load is high
  --help

Chromium: $CHROME_PATH, else the newest headless shell Playwright installed.`;

function fail(message: string): never {
  console.error(`measure-site: ${message}`);
  process.exit(1);
}

/** $CHROME_PATH, else the newest Playwright headless shell, else its full Chromium. */
function findChromium(): { executable: string; args: Array<string> } {
  if (process.env.CHROME_PATH) {
    return { executable: process.env.CHROME_PATH, args: ["--headless=new"] };
  }
  const cache = path.join(homedir(), ".cache", "ms-playwright");
  const newest = (prefix: string) =>
    existsSync(cache)
      ? readdirSync(cache)
          .filter((dir) => dir.startsWith(prefix))
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
          .at(-1)
      : undefined;
  const shell = newest("chromium_headless_shell-");
  if (shell) {
    return {
      executable: path.join(
        cache,
        shell,
        "chrome-headless-shell-linux64",
        "chrome-headless-shell",
      ),
      args: [],
    };
  }
  const full = newest("chromium-");
  if (full) {
    return {
      executable: path.join(cache, full, "chrome-linux64", "chrome"),
      args: ["--headless=new"],
    };
  }
  return fail(
    "no Chromium found. Set CHROME_PATH, or run `cd .claude/skills/run-blog/shots && bunx playwright-core install chromium-headless-shell`.",
  );
}

/** Starts Chromium on a free debugging port; resolves with the port and a stop function. */
function launchChromium() {
  const { executable, args } = findChromium();
  const profile = mkdtempSync(path.join(tmpdir(), "measure-site-"));
  const child = spawn(
    executable,
    [
      ...args,
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-sandbox",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const stop = () => {
    child.kill("SIGKILL");
    rmSync(profile, { recursive: true, force: true });
  };
  return new Promise<{ port: number; stop: () => void }>((resolve, reject) => {
    let log = "";
    const timer = setTimeout(() => {
      stop();
      reject(
        new Error(
          `Chromium did not report a debugging port in 20 s: ${log.slice(-300)}`,
        ),
      );
    }, 20_000);
    child.stderr.on("data", (chunk: Buffer) => {
      log += chunk.toString();
      const match = /DevTools listening on ws:\/\/[^:]+:(\d+)\//.exec(log);
      if (match) {
        clearTimeout(timer);
        resolve({ port: Number(match[1]), stop });
      }
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      stop();
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(
        new Error(
          `Chromium exited with ${code} before it was ready: ${log.slice(-300)}`,
        ),
      );
    });
  });
}

/** One Lighthouse run in a fresh Chromium: no cache or profile carries over. */
async function lighthouseRun(
  url: string,
  throttling: string,
): Promise<LighthouseReport> {
  const chromium = await launchChromium();
  const out = mkdtempSync(path.join(tmpdir(), "measure-site-lh-"));
  const file = path.join(out, "report.json");
  try {
    const result = await new Promise<{ status: number | null; stderr: string }>(
      (resolve) => {
        const child = spawn(
          "bunx",
          [
            `lighthouse@${LIGHTHOUSE_VERSION}`,
            url,
            "--port",
            String(chromium.port),
            "--output=json",
            `--output-path=${file}`,
            "--only-categories=performance",
            `--throttling-method=${throttling}`,
            "--disable-full-page-screenshot",
            "--quiet",
          ],
          { stdio: ["ignore", "ignore", "pipe"], cwd: out },
        );
        let stderr = "";
        child.stderr.on(
          "data",
          (chunk: Buffer) => (stderr += chunk.toString()),
        );
        const timer = setTimeout(() => child.kill("SIGKILL"), RUN_TIMEOUT_MS);
        child.on("close", (status) => {
          clearTimeout(timer);
          resolve({ status, stderr });
        });
      },
    );
    if (!existsSync(file)) {
      throw new Error(
        `lighthouse exited with ${result.status} and wrote no report: ${result.stderr.trim().slice(-400)}`,
      );
    }
    return JSON.parse(readFileSync(file, "utf8")) as LighthouseReport;
  } finally {
    chromium.stop();
    rmSync(out, { recursive: true, force: true });
  }
}

/** Whether another process holds the machine-wide heavy lock (flock -n on the lock file). */
function heavyLockState() {
  const probe = spawnSync("flock", ["-n", HEAVY_LOCK, "true"]);
  const lockHeld = probe.status === 1;
  const holderFile = `${HEAVY_LOCK}.holder`;
  const holder = existsSync(holderFile)
    ? readFileSync(holderFile, "utf8").trim()
    : undefined;
  return { lockHeld, holder };
}

async function fingerprint(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Linux; Android 11) Mobile Safari/537.36",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) fail(`${url} answered ${response.status}`);
  return fingerprintOf(await response.text());
}

function readRound(file: string): Round {
  if (!existsSync(file)) fail(`${file} does not exist`);
  const round = JSON.parse(readFileSync(file, "utf8")) as Round;
  if (round.version !== 1) fail(`${file} is not a round this script wrote`);
  return round;
}

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      runs: { type: "string", default: "5" },
      throttling: { type: "string", default: "simulate" },
      save: { type: "string" },
      against: { type: "string" },
      "max-load": { type: "string", default: String(DEFAULT_MAX_LOAD) },
      force: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help || positionals.length === 0) {
    console.log(HELP);
    process.exit(values.help ? 0 : 2);
  }
  const runs = Number(values.runs);
  if (!Number.isInteger(runs) || runs < 1)
    fail("--runs must be a positive integer");
  const throttling = values.throttling;
  if (throttling !== "simulate" && throttling !== "devtools") {
    fail("--throttling must be simulate or devtools");
  }
  const maxLoad = Number(values["max-load"]);
  if (!Number.isFinite(maxLoad)) fail("--max-load must be a number");
  for (const url of positionals) {
    if (!/^https?:\/\//.test(url)) fail(`${url} is not an http(s) URL`);
  }
  const earlier = values.against ? readRound(values.against) : undefined;

  const lock = heavyLockState();
  const load1Start = loadavg()[0]!;
  const refusal = refusalReason({
    ...lock,
    holdsLockItself: Boolean(process.env.HEAVY_HELD),
    load1: load1Start,
    maxLoad,
    force: values.force,
  });
  if (refusal) fail(`refusing to measure: ${refusal}`);

  const prints = await Promise.all(positionals.map(fingerprint));
  console.log(
    comparabilityLines({
      results: positionals.map((url, i) => ({ url, ...prints[i]! })),
      load1: load1Start,
      cpus: cpus().length,
      throttlingMethod: throttling,
    }).join("\n"),
  );
  console.log(
    `\nMeasuring ${positionals.length} URL(s) x ${runs} run(s) with Lighthouse ${LIGHTHOUSE_VERSION}...`,
  );

  const collected = positionals.map(() => ({
    runs: [] as Array<RunMetrics>,
    failures: 0,
  }));
  let chrome = "";
  const started = Date.now();
  // Interleaved: slow drift on the machine or the network hits every URL alike.
  for (let round = 1; round <= runs; round++) {
    for (const [i, url] of positionals.entries()) {
      try {
        const report = await lighthouseRun(url, throttling);
        chrome =
          /(?:Headless)?Chrome\/(\S+)/.exec(
            report.environment.hostUserAgent,
          )?.[1] ?? chrome;
        collected[i]!.runs.push(runMetricsFrom(report));
        console.error(`  run ${round}/${runs} ${url}: ok`);
      } catch (error) {
        collected[i]!.failures++;
        console.error(
          `  run ${round}/${runs} ${url}: failed: ${(error as Error).message}`,
        );
      }
    }
  }
  const load1End = loadavg()[0]!;

  const results: Array<UrlResult> = [];
  for (const [i, url] of positionals.entries()) {
    const { runs: ok, failures } = collected[i]!;
    if (ok.length === 0) fail(`every run of ${url} failed`);
    results.push({
      url,
      ...prints[i]!,
      runs: ok,
      failures,
      stats: summarize(ok),
    });
  }

  const round: Round = {
    version: 1,
    savedAt: new Date().toISOString(),
    tool: {
      lighthouse: LIGHTHOUSE_VERSION,
      chrome,
      preset: "mobile",
      throttlingMethod: throttling,
    },
    machine: {
      cpus: cpus().length,
      load1Start,
      load1End,
      benchmarkIndex: median(
        results.flatMap((r) => r.runs.map((run) => run.benchmarkIndex)),
      ),
    },
    results,
  };

  console.log(
    `\nDone in ${Math.round((Date.now() - started) / 1000)} s. Load average at the end: ${load1End.toFixed(2)}. Median of Lighthouse's CPU benchmark: ${Math.round(round.machine.benchmarkIndex)}.`,
  );
  const failed = results.filter((r) => r.failures > 0);
  for (const r of failed)
    console.log(
      `${r.url}: ${r.failures} of ${runs} runs failed and are left out.`,
    );
  console.log(`\n${renderTable(results)}\n`);

  if (values.save) {
    writeFileSync(values.save, `${JSON.stringify(round, null, 2)}\n`);
    console.log(`Saved to ${values.save}`);
  }
  if (earlier) {
    const comparison = compareRounds(earlier, round);
    console.log(
      `\nAgainst ${values.against} (saved ${earlier.savedAt}, load ${earlier.machine.load1Start.toFixed(2)}, benchmark ${Math.round(earlier.machine.benchmarkIndex)}):`,
    );
    for (const warning of comparison.warnings)
      console.log(`WARNING: ${warning}`);
    for (const url of comparison.unmatched)
      console.log(`WARNING: ${url} is in only one of the two rounds.`);
    const before = new Map(earlier.results.map((r) => [r.url, r]));
    for (const r of results) {
      const b = before.get(r.url);
      if (b && b.modulepreloads !== r.modulepreloads) {
        console.log(
          `Note: ${r.url} has ${b.modulepreloads} modulepreload links before and ${r.modulepreloads} now.`,
        );
      }
    }
    console.log(`\n${renderComparison(comparison)}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
