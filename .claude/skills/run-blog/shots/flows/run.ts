/**
 * The `flows` command: runs the flows of `list.ts` against a running site,
 * prints one line per flow, and with `--compare` the differences between two
 * sites. The browser launch and the `--base` and `--session` conventions are
 * those of `shoot`.
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import type { Browser, BrowserContext, Page } from "playwright-core";
import {
  noiseOf,
  readToasts,
  type Flow,
  type FlowContext,
  type Need,
  type Noise,
  type Recorded,
  type Tab,
  type Value,
} from "./context.ts";
import { FLOWS } from "./list.ts";
import {
  guardSession,
  openLocalDb,
  THROWAWAY_ADMIN_ID,
  type LocalDb,
} from "./local-db.ts";

export const FLOWS_USAGE = `  shots.ts flows --base <url> [--session <token> | --api-key-file <toml>]
                 [--only <names>] [--compare <other-base>] [--tolerance 50] [--deadline 15] [--flow-timeout <s>] [--list]`;

interface Deps {
  launch: () => Promise<Browser>;
  requireAnswer: (base: URL) => Promise<void>;
  fail: (message: string) => never;
  csv: (value: string) => Array<string>;
}

interface Site {
  base: URL;
  session?: string;
  /** Sent as `x-api-key` to `base.origin` and nowhere else; never printed. */
  apiKey?: string;
}

interface Outcome {
  name: string;
  status: "pass" | "fail" | "skip";
  observed: Map<string, Value>;
  problems: Array<string>;
  /** Why a skipped flow was skipped. */
  reason?: string;
  ms: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const CLOSE_TIMEOUT_MS = 10_000;
/** The whole run of one site ends after this; the flows not yet run fail. */
const DEFAULT_DEADLINE_MINUTES = 15;
/** Timings closer than this are equal whatever the tolerance says. */
const TIMING_FLOOR_MS = 400;

const pathOf = (page: Page) => {
  try {
    return new URL(page.url()).pathname;
  } catch {
    return page.url();
  }
};

const isLocal = (base: URL) =>
  /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/.test(base.hostname);

/** `url` and `api_key` of a `config.toml` of the flare-stack-blog skill. */
function readKeyFile(file: string, fail: Deps["fail"]) {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return fail(`--api-key-file: cannot read ${file}`);
  }
  const field = (name: string) =>
    new RegExp(`^\\s*${name}\\s*=\\s*"([^"]*)"`, "m").exec(text)?.[1];
  const url = field("url");
  const key = field("api_key");
  if (!url || !key) {
    fail(`--api-key-file: ${file} needs url = "..." and api_key = "..."`);
  }
  return { url: new URL(url), key };
}

function skipReason(
  needs: ReadonlyArray<Need>,
  site: Site,
  db: LocalDb | undefined,
): string | undefined {
  if (needs.includes("session") && !site.session && !site.apiKey) {
    return "needs --session or --api-key-file";
  }
  if (needs.includes("cookie") && !site.session) {
    return "needs --session (an API key cannot sign in or out)";
  }
  if (needs.includes("local-db") && !db) {
    return "writes to the local database: needs a local dev server and its throwaway Admin";
  }
  return undefined;
}

async function runFlow(
  flow: Flow,
  site: Site,
  browser: Browser,
  db: LocalDb | undefined,
  timeoutOverrideMs?: number,
): Promise<Outcome> {
  const outcome: Outcome = {
    name: flow.name,
    status: "pass",
    observed: new Map(),
    problems: [],
    ms: 0,
  };
  const reason = skipReason(flow.needs ?? [], site, db);
  if (reason) return { ...outcome, status: "skip", reason };

  const started = Date.now();
  const noise: Array<Noise> = [];
  const contexts: Array<BrowserContext> = [];
  const origin = site.base.origin;

  const attach = (context: BrowserContext, page: Page): Tab => {
    const requests: Array<Recorded> = [];
    const byRequest = new Map<unknown, Recorded>();
    page.on("request", (request) => {
      const recorded: Recorded = {
        at: Date.now(),
        method: request.method(),
        url: new URL(request.url()),
      };
      byRequest.set(request, recorded);
      requests.push(recorded);
    });
    page.on("response", (response) => {
      const recorded = byRequest.get(response.request());
      if (recorded) recorded.status = response.status();
    });
    page.on("pageerror", (error) =>
      noise.push({ kind: "pageerror", text: error.message, at: pathOf(page) }),
    );
    page.on("console", (message) => {
      const found = noiseOf(message, origin);
      if (found) noise.push({ ...found, at: pathOf(page) });
    });
    const tab: Tab = {
      page,
      context,
      requests,
      toasts: () => readToasts(page),
      async waitForToast(timeoutMs = 8000) {
        await page
          .waitForSelector("[data-sonner-toast]", { timeout: timeoutMs })
          .catch(() => {});
        return readToasts(page);
      },
      async sibling() {
        return attach(context, await context.newPage());
      },
      throttle: async () => {
        const session = await context.newCDPSession(page);
        await session.send("Network.enable");
        await session.send("Network.emulateNetworkConditions", {
          offline: false,
          latency: 400,
          downloadThroughput: 400 * 1024,
          uploadThroughput: 400 * 1024,
        });
        return session;
      },
    };
    return tab;
  };

  const ctx: FlowContext = {
    base: site.base,
    browser,
    canSignIn: Boolean(site.session || site.apiKey),
    hasCookie: Boolean(site.session),
    sessionCookie: site.session,
    db,
    url: (path) => new URL(path, site.base).href,
    observe: (key, value) => void outcome.observed.set(key, value),
    check: (ok, problem) => {
      if (!ok) outcome.problems.push(problem);
    },
    async open({ width = 1440, height = 900, signedIn = false } = {}) {
      const touch = width < 600;
      const context = await browser.newContext({
        locale: "zh-CN",
        viewport: { width, height },
        hasTouch: touch,
        isMobile: touch,
      });
      contexts.push(context);
      await context.grantPermissions(["clipboard-read", "clipboard-write"], {
        origin,
      });
      if (signedIn && !site.session && !site.apiKey) {
        throw new Error("signed-in tab without --session or --api-key-file");
      }
      if (signedIn && site.session) {
        await context.addCookies([
          {
            name: "better-auth.session_token",
            value: site.session,
            domain: site.base.hostname,
            path: "/",
          },
        ]);
      } else if (signedIn && site.apiKey) {
        const key = site.apiKey;
        await context.route(
          (url) => url.origin === origin,
          (route) =>
            route.continue({
              headers: { ...route.request().headers(), "x-api-key": key },
            }),
        );
      }
      return attach(context, await context.newPage());
    },
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      flow.run(ctx),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("timed out")),
          timeoutOverrideMs ?? flow.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        );
      }),
    ]);
  } catch (error) {
    outcome.problems.push(
      `error: ${(error as Error).message.split("\n")[0]}`.slice(0, 300),
    );
  } finally {
    clearTimeout(timer);
    // A browser that no longer answers must not hold the run.
    await Promise.race([
      Promise.all(contexts.map((context) => context.close())).catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, CLOSE_TIMEOUT_MS)),
    ]);
  }
  for (const item of noise) {
    outcome.problems.push(
      `${item.kind} on ${item.at}: ${item.text.replace(/\s+/g, " ").slice(0, 240)}`,
    );
  }
  outcome.ms = Date.now() - started;
  outcome.status = outcome.problems.length ? "fail" : "pass";
  return outcome;
}

function describe(observed: Map<string, Value>) {
  return [...observed].map(([key, value]) => `${key}=${value}`).join(", ");
}

function printOutcome(outcome: Outcome, width: number) {
  const tag =
    outcome.status === "pass"
      ? "pass"
      : outcome.status === "fail"
        ? "FAIL"
        : "skip";
  const name = outcome.name.padEnd(width);
  if (outcome.status === "skip") {
    console.log(`${tag}  ${name}  ${outcome.reason}`);
    return;
  }
  console.log(
    `${tag}  ${name}  ${describe(outcome.observed)}  (${(outcome.ms / 1000).toFixed(1)} s)`,
  );
  for (const problem of outcome.problems) console.log(`      - ${problem}`);
}

/** The site answers, and takes the run's credentials; ends the run with one line when not. Returns the signed-in user's id. */
async function preflight(site: Site, deps: Deps) {
  await deps.requireAnswer(site.base);
  const user = await sessionUser(site);
  if ((site.session || site.apiKey) && user === undefined) {
    // Every signed-in flow would wait out its timeout: say so at once.
    console.error(
      `shots flows: ${site.base.origin} does not accept ${site.session ? "the --session cookie" : "the API key"} (get-session answers no user). A cookie is signed with the secret of the site's .dev.vars and names a row of its database: a site with its own database or secret needs its own cookie.`,
    );
    process.exit(1);
  }
  return user;
}

async function runAll(
  flows: Array<Flow>,
  site: Site,
  deps: Deps,
  print: boolean,
  deadlineMs: number,
  flowTimeoutMs?: number,
): Promise<Array<Outcome>> {
  const user = await preflight(site, deps);
  const db =
    isLocal(site.base) && user === THROWAWAY_ADMIN_ID
      ? openLocalDb()
      : undefined;
  const guard = db && site.session ? guardSession(db, site.session) : undefined;
  const browser = await deps.launch();
  const outcomes: Array<Outcome> = [];
  const width = Math.max(...flows.map((flow) => flow.name.length));
  try {
    const started = Date.now();
    for (const flow of flows) {
      console.error(`flows: ${site.base.origin} ${flow.name}`);
      const outcome =
        Date.now() - started > deadlineMs
          ? ({
              name: flow.name,
              status: "fail",
              observed: new Map(),
              problems: [
                `not run: the ${Math.round(deadlineMs / 60000)} minute limit of the run was reached`,
              ],
              ms: 0,
            } satisfies Outcome)
          : await runFlow(flow, site, browser, db, flowTimeoutMs);
      // A flow that signed out ended the session the next one needs.
      guard?.restore();
      outcomes.push(outcome);
      if (print) printOutcome(outcome, width);
    }
  } finally {
    // A run once hung here, after its last flow, with the browser gone but
    // never reaped: do not wait for it longer than the contexts.
    await Promise.race([
      browser.close().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, CLOSE_TIMEOUT_MS)),
    ]);
    db?.close();
  }
  return outcomes;
}

/** The id of the user the site's session answers for the run's credentials, or undefined. */
async function sessionUser(site: Site) {
  const headers: Record<string, string> = {};
  if (site.session) {
    headers.cookie = `better-auth.session_token=${site.session}`;
  } else if (site.apiKey) {
    headers["x-api-key"] = site.apiKey;
  } else return undefined;
  try {
    const response = await fetch(new URL("/api/auth/get-session", site.base), {
      headers,
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await response.json()) as { user?: { id?: string } } | null;
    return body?.user?.id;
  } catch {
    return undefined;
  }
}

function sameValue(key: string, a: Value, b: Value, tolerance: number) {
  if (a === b) return true;
  if (key.endsWith("Ms") && typeof a === "number" && typeof b === "number") {
    return (
      Math.abs(a - b) <=
      Math.max(TIMING_FLOOR_MS, (tolerance / 100) * Math.max(a, b))
    );
  }
  return false;
}

/** The differences between two runs of one flow, as lines. */
function differences(a: Outcome, b: Outcome, tolerance: number) {
  const lines: Array<string> = [];
  if (a.status !== b.status) lines.push(`status: ${a.status} vs ${b.status}`);
  for (const key of new Set([...a.observed.keys(), ...b.observed.keys()])) {
    const left = a.observed.get(key);
    const right = b.observed.get(key);
    if (left === undefined || right === undefined) {
      lines.push(`${key}: ${left ?? "(absent)"} vs ${right ?? "(absent)"}`);
    } else if (!sameValue(key, left, right, tolerance)) {
      lines.push(`${key}: ${left} vs ${right}`);
    }
  }
  return lines;
}

export async function flows(args: Array<string>, deps: Deps) {
  const { values } = parseArgs({
    args,
    options: {
      base: { type: "string" },
      session: { type: "string" },
      "api-key-file": { type: "string" },
      only: { type: "string" },
      compare: { type: "string" },
      tolerance: { type: "string", default: "50" },
      "flow-timeout": { type: "string" },
      deadline: { type: "string", default: String(DEFAULT_DEADLINE_MINUTES) },
      list: { type: "boolean", default: false },
    },
  });
  if (values.list) {
    for (const flow of FLOWS)
      console.log(`${flow.name.padEnd(28)}${flow.summary}`);
    return 0;
  }
  const keyed = values["api-key-file"]
    ? readKeyFile(values["api-key-file"], deps.fail)
    : undefined;
  if (!values.base && !keyed) {
    deps.fail("--base (or --api-key-file, which names the site) is required");
  }
  const base = new URL(values.base ?? keyed!.url);
  if (keyed && keyed.url.origin !== base.origin) {
    deps.fail(
      `--api-key-file is for ${keyed.url.origin}; the key is sent to that origin only, not to ${base.origin}`,
    );
  }
  const deadlineMs = Number(values.deadline) * 60_000;
  if (!(deadlineMs > 0)) deps.fail("--deadline is a number of minutes");
  const flowTimeoutMs = values["flow-timeout"]
    ? Number(values["flow-timeout"]) * 1000
    : undefined;
  if (flowTimeoutMs !== undefined && !(flowTimeoutMs > 0)) {
    deps.fail("--flow-timeout is a number of seconds");
  }
  const tolerance = Number(values.tolerance);
  if (!(tolerance >= 0)) deps.fail("--tolerance is a percentage");

  let selected = FLOWS;
  if (values.only) {
    const wanted = deps.csv(values.only);
    const unknown = wanted.filter(
      (name) => !FLOWS.some((f) => f.name === name),
    );
    if (unknown.length) {
      deps.fail(
        `unknown flow: ${unknown.join(", ")} (known: ${FLOWS.map((f) => f.name).join(", ")})`,
      );
    }
    selected = FLOWS.filter((flow) => wanted.includes(flow.name));
  }

  const site: Site = { base, session: values.session, apiKey: keyed?.key };
  const other: Site | undefined = values.compare
    ? { base: new URL(values.compare), session: values.session }
    : undefined;

  // Both sites are checked before the first flow runs, so a cookie that the
  // other site does not know costs seconds, not a run.
  if (other) await preflight(other, deps);
  const outcomes = await runAll(
    selected,
    site,
    deps,
    !other,
    deadlineMs,
    flowTimeoutMs,
  );
  const total = (list: Array<Outcome>) => ({
    passed: list.filter((o) => o.status === "pass").length,
    failed: list.filter((o) => o.status === "fail").length,
    skipped: list.filter((o) => o.status === "skip").length,
  });

  if (!other) {
    const { passed, failed, skipped } = total(outcomes);
    console.log(
      `\n${outcomes.length} flows: ${passed} passed, ${failed} failed, ${skipped} skipped`,
    );
    return failed ? 1 : 0;
  }

  const compared = await runAll(
    selected,
    other,
    deps,
    false,
    deadlineMs,
    flowTimeoutMs,
  );
  const width = Math.max(...selected.map((flow) => flow.name.length));
  let different = 0;
  let failed = 0;
  for (const [index, left] of outcomes.entries()) {
    const right = compared[index]!;
    const lines = differences(left, right, tolerance);
    failed += [left, right].filter((o) => o.status === "fail").length;
    different += lines.length ? 1 : 0;
    const name = left.name.padEnd(width);
    console.log(
      `${lines.length ? "DIFF" : "same"}  ${name}${left.status === "skip" ? `  skipped: ${left.reason}` : ""}`,
    );
    for (const line of lines) console.log(`      ${line}`);
    for (const [label, o] of [
      ["base", left],
      ["compare", right],
    ] as const) {
      for (const problem of o.status === "fail" ? o.problems : []) {
        console.log(`      ${label}: ${problem}`);
      }
    }
  }
  console.log(
    `\n${selected.length} flows: ${different} differ, ${failed} failed runs (${base.origin} vs ${other.base.origin})`,
  );
  return different + failed > 0 ? 1 : 0;
}
