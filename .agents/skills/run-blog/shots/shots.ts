/**
 * Screenshots the blog, compares two sets of screenshots and tiles a set into
 * sheets. Run from the repo root:
 *
 *   bun .agents/skills/run-blog/shots/shots.ts shoot   --base <url> --out <dir> [...]
 *   bun .agents/skills/run-blog/shots/shots.ts compare <dirA> <dirB> [--out <dir>] [--threshold 0]
 *   bun .agents/skills/run-blog/shots/shots.ts sheet   <dir> --out <file.png> [--match s] [--columns 4] [--cell-width 480]
 *   bun .agents/skills/run-blog/shots/shots.ts flows   --base <url> [--session <token>] [--only a,b] [--compare <url>]
 *
 * or `bun run shots ...`. The tool's own dependencies install themselves on the
 * first run.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import type { Browser, Page } from "playwright-core";
import { FLOWS_USAGE, flows } from "./flows/run.ts";

/** Installs the tool's own dependencies once, through the machine lock when the repo has it. */
function ensureDependencies() {
  const here = import.meta.dirname;
  if (existsSync(path.join(here, "node_modules", "playwright-core"))) return;
  console.error("shots: installing its dependencies (once)");
  const lock = path.resolve(here, "../../../../scripts/heavy.sh");
  const install = ["bun", "install", "--cwd", here];
  const [command, ...args] = existsSync(lock) ? [lock, ...install] : install;
  const result = spawnSync(command!, args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`shots: bun install --cwd ${here} failed`);
    process.exit(2);
  }
}

ensureDependencies();
const { default: pixelmatch } = await import("pixelmatch");
const { chromium } = await import("playwright-core");
const { PNG } = await import("pngjs");
type PNG = InstanceType<typeof PNG>;

const USAGE = `usage:
  shots.ts shoot --base <url> --out <dir> [--pages /,/posts] [--widths 1440,820,390]
                 [--schemes light,dark] [--views full|top|end|<px>,...]
                 [--theme <id>] [--theme-options <json>] [--session <token>]
                 [--locale zh|en] [--reduced-motion] [--mask <css>] [--concurrency 2]
                 [--timeout 45] [--scroller <css>]
                 [--click <css>]... [--press <key>]... [--hover <css>] [--name <suffix>]
  shots.ts compare <dirA> <dirB> [--out <dir>] [--threshold 0]
  shots.ts sheet <dir> --out <file.png> [--match <substring>] [--columns 2] [--cell-width 960] [--per-sheet 6]
${FLOWS_USAGE}`;

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

function csv(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------- browser

/** The newest headless shell Playwright installed, or exits with how to get it. */
function findChrome() {
  const cache = path.join(homedir(), ".cache", "ms-playwright");
  const revision = (name: string) => Number(name.split("-")[1]);
  const newest = existsSync(cache)
    ? readdirSync(cache)
        .filter((name) => /^chromium_headless_shell-\d+$/.test(name))
        .sort((a, b) => revision(b) - revision(a))
        .map((name) =>
          path.join(
            cache,
            name,
            "chrome-headless-shell-linux64",
            "chrome-headless-shell",
          ),
        )
        .find((file) => existsSync(file))
    : undefined;
  if (!newest) {
    fail(
      "Chromium headless shell not found: run `cd .agents/skills/run-blog/shots && bunx playwright-core install chromium-headless-shell`.",
    );
  }
  return newest;
}

function launch() {
  return chromium.launch({
    executablePath: findChrome(),
    args: ["--no-sandbox"],
  });
}

// ------------------------------------------------------------------ shoot

/** Replaced by a flat grey box before every shot: both change between runs. */
const DEFAULT_MASKS = ["time", ".comment-avatar"];

type Scheme = "light" | "dark";

interface ShootOptions {
  base: URL;
  out: string;
  pages: Array<string>;
  widths: Array<number>;
  schemes: Array<Scheme>;
  views: Array<string>;
  theme?: string;
  themeOptions?: string;
  session?: string;
  locale?: string;
  reducedMotion: boolean;
  masks: Array<string>;
  concurrency: number;
  /** Navigation limit in ms. */
  timeout: number;
  /** CSS of the element that scrolls the page, when detection is not wanted. */
  scroller?: string;
  clicks: Array<string>;
  presses: Array<string>;
  hover?: string;
  /** Appended to the file names. */
  name?: string;
}

interface Issue {
  kind: "pageerror" | "console" | "http" | "load" | "unstable" | "capped";
  text: string;
}

interface UnitResult {
  page: string;
  width: number;
  cls: number;
  overflow: number;
  issues: Array<Issue>;
}

/** A path made filename-safe: `/` is `home`, `/post/a b` is `post-a-b`. */
function slugOf(pagePath: string) {
  let decoded = pagePath;
  try {
    decoded = decodeURIComponent(pagePath);
  } catch {
    // keep the raw path
  }
  const slug = decoded
    .replace(/[^\p{L}\p{N}._]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "home";
}

function viewport(width: number) {
  return { width, height: width >= 1024 ? 900 : width >= 600 ? 1100 : 844 };
}

function addressOf(options: ShootOptions, pagePath: string) {
  const url = new URL(pagePath, options.base);
  if (options.theme) {
    url.searchParams.set("themePreview", options.theme);
    if (options.themeOptions) {
      url.searchParams.set("themePreviewOptions", options.themeOptions);
    }
  }
  return url.href;
}

/** Layout shifts are collected from the first paint on. */
function observeLayoutShifts() {
  const state = { cls: 0 };
  (window as unknown as { __cls: typeof state }).__cls = state;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as Array<
      PerformanceEntry & { value: number; hadRecentInput: boolean }
    >) {
      if (!entry.hadRecentInput) state.cls += entry.value;
    }
  }).observe({ type: "layout-shift", buffered: true });
}

/** Marks the element that scrolls the page (see `markScroller`). */
const SCROLLER_ATTR = "data-shots-scroller";
const SCROLLER = `[${SCROLLER_ATTR}]`;
/** The tallest a viewport grows to take in a scroll container. */
const MAX_VIEWPORT_HEIGHT = 8000;

class ShotsError extends Error {}

/**
 * Finds the element that scrolls the page and marks it with `SCROLLER_ATTR`.
 * The document usually scrolls; in the Admin it does not, and a container
 * inside it does: then the largest scroll container (a good part of the
 * viewport, content taller than its box) is the one. `override` is a CSS
 * selector that wins over detection. Run again after content arrives.
 */
async function markScroller(page: Page, override?: string) {
  const found = await page.evaluate(
    ([attr, selector]) => {
      for (const old of document.querySelectorAll(`[${attr}]`)) {
        old.removeAttribute(attr);
      }
      let target: Element | null = null;
      if (selector) {
        target = document.querySelector(selector);
      } else if (
        document.documentElement.scrollHeight <=
        window.innerHeight + 1
      ) {
        let best = 0;
        const candidates = [
          document.body,
          ...document.body.querySelectorAll("*"),
        ];
        for (const element of candidates) {
          if (!(element instanceof HTMLElement)) continue;
          if (element.scrollHeight - element.clientHeight <= 1) continue;
          const overflow = getComputedStyle(element).overflowY;
          if (overflow !== "auto" && overflow !== "scroll") continue;
          const area = element.clientWidth * element.clientHeight;
          if (area < 0.25 * window.innerWidth * window.innerHeight) continue;
          if (area > best) {
            best = area;
            target = element;
          }
        }
      }
      target?.setAttribute(attr, "");
      return target !== null;
    },
    [SCROLLER_ATTR, override] as const,
  );
  if (override && !found) {
    throw new ShotsError(`--scroller matched nothing: ${override}`);
  }
  return found;
}

/** Waits until the page height has not changed for `quietMs` (late hydration, data, images). */
async function waitForStableHeight(page: Page, quietMs = 800, maxMs = 15000) {
  await page.evaluate(
    async ([quiet, max, scroller]) => {
      const started = Date.now();
      let last = -1;
      let since = Date.now();
      while (Date.now() - started < max) {
        const height = Math.max(
          document.documentElement.scrollHeight,
          document.querySelector(scroller)?.scrollHeight ?? 0,
        );
        if (height !== last) {
          last = height;
          since = Date.now();
        } else if (Date.now() - since >= quiet) return;
        await new Promise((r) => setTimeout(r, 100));
      }
    },
    [quietMs, maxMs, SCROLLER] as const,
  );
}

/** Skeletons (`animate-pulse`) are what a page shows while data is on its way. */
async function waitForSkeletons(page: Page) {
  await page
    .waitForFunction(
      () => !document.querySelector(".animate-pulse"),
      undefined,
      {
        timeout: 10000,
      },
    )
    .catch(() => {});
}

/** Scrolls through the page and back so lazy images load, then waits for them. */
async function loadEverything(page: Page, scrollerCss?: string) {
  await waitForStableHeight(page);
  // The Admin shows a skeleton first, and its container scrolls only once the
  // data is there: look for the scroller after that.
  await waitForSkeletons(page);
  // Parts of the page appear only once scrolled into view, and a list may load
  // its next page when its end is reached (/posts): scroll through, pause at
  // the end until the height stops changing, and go on while the page grew.
  // The scrolled element is the page's scroll container, else the document.
  let from = 0;
  let height = 0;
  for (let pass = 0; pass < 10; pass++) {
    await markScroller(page, scrollerCss);
    const grown = await page.evaluate(
      async ([start, scroller]) => {
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
        const el =
          document.querySelector(scroller) ?? document.scrollingElement!;
        const step = Math.max(300, Math.round(el.clientHeight * 0.8));
        for (let y = start; y < el.scrollHeight; y += step) {
          el.scrollTo({ top: y, behavior: "instant" });
          await sleep(120);
        }
        el.scrollTo({ top: el.scrollHeight, behavior: "instant" });
        for (const img of document.images) img.loading = "eager";
        return el.scrollHeight;
      },
      [from, SCROLLER] as const,
    );
    await waitForStableHeight(page);
    const now = await page.evaluate(
      (scroller) =>
        (document.querySelector(scroller) ?? document.documentElement)
          .scrollHeight,
      SCROLLER,
    );
    if (pass > 0 && now === height) break;
    from = Math.max(0, grown - 300);
    height = now;
  }
  const unloaded = await page.evaluate(async (scroller) => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const pending = [...document.images].filter((img) => !img.complete);
    await Promise.race([
      Promise.all(
        pending.map(
          (img) =>
            new Promise((resolve) => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            }),
        ),
      ),
      sleep(8000),
    ]);
    await Promise.all(
      [...document.images].map((img) => img.decode().catch(() => {})),
    );
    await document.fonts.ready;
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelector(scroller)?.scrollTo({ top: 0, behavior: "instant" });
    return [...document.images]
      .filter((img) => !img.complete)
      .map((img) => img.src);
  }, SCROLLER);
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await waitForSkeletons(page);
  await waitForStableHeight(page);
  return unloaded;
}

/**
 * Stops everything that moves and paints the masked elements as flat boxes.
 * Animations are ended through the Web Animations API, not by forcing a
 * duration of 0 in CSS: that would also pin scroll-driven animations (the
 * banner drift) to their end state.
 */
async function makeStill(page: Page, masks: Array<string>) {
  const maskCss = masks.length
    ? `${masks.join(",")}{background:#808080!important;background-image:none!important;border-radius:0!important;box-shadow:none!important;text-shadow:none!important;filter:brightness(0) invert(.5)!important}`
    : "";
  await page.addStyleTag({
    content: `*,*::before,*::after{transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}${maskCss}`,
  });
  await settleMotion(page, true);
}

/**
 * Ends every animation and transition still running (CSS ones too) and stops
 * videos. Animations tied to the scroll position are left alone.
 * `pinText` also gives relative times a fixed text, so their width cannot move
 * what sits next to them.
 */
async function settleMotion(page: Page, pinText: boolean) {
  await page.evaluate(async (pin) => {
    const frame = () =>
      new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    // Images decoded asynchronously can miss a screenshot taken right after a
    // scroll or in a full-page capture: decode them all up front, in the open.
    for (const img of document.images) img.decoding = "sync";
    await Promise.all(
      [...document.images].map((img) => img.decode().catch(() => {})),
    );
    // Animations can start late (hydration, an element coming into view), so
    // go on until two passes in a row find nothing left to end.
    let quiet = 0;
    for (let pass = 0; pass < 60 && quiet < 2; pass++) {
      let ended = 0;
      for (const animation of document.getAnimations()) {
        if (animation.timeline !== document.timeline) continue;
        const infinite =
          animation.effect?.getComputedTiming().iterations === Infinity;
        try {
          if (infinite) {
            if (animation.playState === "running") {
              // An endless loop is parked at its start, whatever the clock says.
              animation.pause();
              animation.currentTime = 0;
              ended++;
            }
          } else if (animation.playState !== "finished") {
            animation.finish();
            ended++;
          }
        } catch {
          animation.pause();
        }
      }
      quiet = ended === 0 ? quiet + 1 : 0;
      await frame();
      await frame();
    }
    for (const video of document.querySelectorAll("video")) video.pause();
    if (pin) {
      for (const time of document.querySelectorAll("time")) {
        if (/前|刚刚|\bago\b|just now/i.test(time.textContent ?? "")) {
          time.textContent = "刚刚";
        }
      }
    }
  }, pinText);
  await page.waitForTimeout(200);
}

/**
 * Captures until two captures in a row are byte-identical: a backdrop blur or
 * a compositor animation can come out differently from one capture to the next.
 */
async function stableScreenshot(page: Page, fullPage: boolean) {
  let previous = await page.screenshot({ fullPage });
  for (let attempt = 0; attempt < 5; attempt++) {
    const next = await page.screenshot({ fullPage });
    if (next.equals(previous)) return { image: next, stable: true };
    previous = next;
  }
  return { image: previous, stable: false };
}

async function scrollTo(page: Page, target: "top" | "end" | number) {
  // Always arrive from the top, so scroll-aware headers are in the same state.
  await page.evaluate((scroller) => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelector(scroller)?.scrollTo({ top: 0, behavior: "instant" });
  }, SCROLLER);
  await page.waitForTimeout(100);
  await page.evaluate(
    ([to, scroller]) => {
      const el = document.querySelector(scroller) ?? document.scrollingElement!;
      const max = el.scrollHeight - el.clientHeight;
      const top = to === "end" ? max : to === "top" ? 0 : Math.min(to, max);
      el.scrollTo({ top, behavior: "instant" });
    },
    [target, SCROLLER] as const,
  );
  await page.waitForTimeout(250);
  await settleMotion(page, false);
}

/**
 * Grows the viewport by what the page's scroll container hides, so one
 * capture holds all of it. Returns false when the 8000 px cap cut it short.
 */
async function growViewportToContent(page: Page) {
  for (let pass = 0; pass < 3; pass++) {
    const hidden = await page.evaluate((scroller) => {
      const el = document.querySelector(scroller);
      return el ? el.scrollHeight - el.clientHeight : 0;
    }, SCROLLER);
    if (hidden <= 1) break;
    const size = page.viewportSize()!;
    const height = Math.min(MAX_VIEWPORT_HEIGHT, size.height + hidden);
    if (height === size.height) return false;
    await page.setViewportSize({ width: size.width, height });
    await page.waitForTimeout(300);
    await waitForStableHeight(page, 500, 5000);
  }
  const left = await page.evaluate((scroller) => {
    const el = document.querySelector(scroller);
    return el ? el.scrollHeight - el.clientHeight : 0;
  }, SCROLLER);
  return left <= 1;
}

/** Clicks, key presses and a hover, in that order: the state a shot shows. */
async function applyStates(page: Page, options: ShootOptions) {
  const reach = async (selector: string, flag: string) => {
    const target = page.locator(selector).first();
    try {
      await target.waitFor({ state: "attached", timeout: 5000 });
    } catch {
      throw new ShotsError(`${flag} matched nothing: ${selector}`);
    }
    return target;
  };
  for (const selector of options.clicks) {
    await (await reach(selector, "--click")).click({ timeout: 10000 });
    await page.waitForTimeout(200);
    await settleMotion(page, false);
  }
  for (const key of options.presses) {
    await page.keyboard.press(key);
    await page.waitForTimeout(200);
    await settleMotion(page, false);
  }
  if (options.hover) {
    await (await reach(options.hover, "--hover")).hover({ timeout: 10000 });
    await page.waitForTimeout(200);
    await settleMotion(page, false);
  }
}

async function shootUnit(
  browser: Browser,
  options: ShootOptions,
  pagePath: string,
  width: number,
  scheme: Scheme,
): Promise<UnitResult> {
  const result: UnitResult = {
    page: pagePath,
    width,
    cls: 0,
    overflow: 0,
    issues: [],
  };
  const touch = width < 600;
  const context = await browser.newContext({
    locale: "zh-CN",
    viewport: viewport(width),
    colorScheme: scheme,
    deviceScaleFactor: 1,
    hasTouch: touch,
    isMobile: touch,
    reducedMotion: options.reducedMotion ? "reduce" : "no-preference",
  });
  try {
    const cookies = [];
    if (options.session) {
      cookies.push({
        name: "better-auth.session_token",
        value: options.session,
        domain: options.base.hostname,
        path: "/",
      });
    }
    if (options.locale) {
      cookies.push({
        name: "LOCALE",
        value: options.locale,
        domain: options.base.hostname,
        path: "/",
      });
    }
    if (cookies.length) await context.addCookies(cookies);

    const page = await context.newPage();
    page.on("pageerror", (error) =>
      result.issues.push({ kind: "pageerror", text: error.message }),
    );
    page.on("console", (message) => {
      if (message.type() === "error") {
        result.issues.push({ kind: "console", text: message.text() });
      }
    });
    await page.addInitScript(observeLayoutShifts);

    try {
      const response = await page.goto(addressOf(options, pagePath), {
        waitUntil: "load",
        timeout: options.timeout,
      });
      if (response && response.status() >= 400) {
        result.issues.push({
          kind: "http",
          text: `HTTP ${response.status()}`,
        });
      }
    } catch (error) {
      result.issues.push({
        kind: "load",
        text: `navigation failed: ${(error as Error).message.split("\n")[0]}`,
      });
      return result;
    }
    await page
      .waitForLoadState("networkidle", { timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(500);
    result.cls = await page.evaluate(
      () => (window as unknown as { __cls: { cls: number } }).__cls?.cls ?? 0,
    );

    for (const src of await loadEverything(page, options.scroller)) {
      result.issues.push({ kind: "load", text: `image never loaded: ${src}` });
    }
    await makeStill(page, options.masks);
    result.overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return (
        Math.max(doc.scrollWidth, document.body.scrollWidth) - doc.clientWidth
      );
    });
    await applyStates(page, options);

    const prefix = `${slugOf(pagePath)}-${width}-${scheme}`;
    const suffix = options.name ? `-${slugOf(options.name)}` : "";
    for (const view of options.views) {
      const file = path.join(options.out, `${prefix}-${view}${suffix}.png`);
      await scrollTo(
        page,
        view === "full"
          ? "top"
          : view === "top"
            ? "top"
            : view === "end"
              ? "end"
              : Number(view),
      );
      // A page that scrolls inside an element is shot on a taller viewport.
      const grown = view === "full";
      if (grown && !(await growViewportToContent(page))) {
        result.issues.push({
          kind: "capped",
          text: `${path.basename(file)} is cut at ${MAX_VIEWPORT_HEIGHT}px`,
        });
      }
      const png = await stableScreenshot(page, view === "full");
      if (grown) {
        await page.setViewportSize(viewport(width));
        await page.waitForTimeout(200);
      }
      writeFileSync(file, png.image);
      if (!png.stable) {
        result.issues.push({
          kind: "unstable",
          text: `${path.basename(file)} still changed between captures`,
        });
      }
    }
  } catch (error) {
    result.issues.push({
      kind: "load",
      text: `shooting failed: ${(error as Error).message.split("\n")[0]}`,
    });
  } finally {
    await context.close();
  }
  return result;
}

/** One request before the run: a server that does not answer ends it in 15 s with one line. */
async function requireAnswer(base: URL) {
  try {
    await fetch(base, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    const reason =
      (error as Error).name === "TimeoutError"
        ? "no answer within 15 s"
        : ((error as Error).cause as Error | undefined)?.message ||
          (error as Error).message;
    console.error(`shots: ${base.origin} is not answering (${reason})`);
    process.exit(1);
  }
}

async function shoot(args: Array<string>) {
  const { values } = parseArgs({
    args,
    options: {
      base: { type: "string" },
      out: { type: "string" },
      pages: { type: "string", default: "/" },
      widths: { type: "string", default: "1440,820,390" },
      schemes: { type: "string", default: "light,dark" },
      views: { type: "string", default: "full" },
      theme: { type: "string" },
      "theme-options": { type: "string" },
      session: { type: "string" },
      locale: { type: "string" },
      "reduced-motion": { type: "boolean", default: false },
      mask: { type: "string" },
      concurrency: { type: "string", default: "2" },
      timeout: { type: "string", default: "45" },
      scroller: { type: "string" },
      click: { type: "string", multiple: true },
      press: { type: "string", multiple: true },
      hover: { type: "string" },
      name: { type: "string" },
    },
  });
  if (!values.base || !values.out)
    fail(`--base and --out are required\n${USAGE}`);
  if ((values.theme || values["theme-options"]) && !values.session) {
    fail(
      "--theme and --theme-options need --session (only an Admin sees a preview)",
    );
  }
  if (values["theme-options"] && !values.theme)
    fail("--theme-options needs --theme");
  if (values.locale && !["zh", "en"].includes(values.locale)) {
    fail("--locale is zh or en");
  }
  const schemes = csv(values.schemes!);
  if (schemes.some((s) => s !== "light" && s !== "dark")) {
    fail("--schemes is light, dark or both");
  }
  const views = csv(values.views!);
  if (views.some((v) => !/^(top|full|end|\d+)$/.test(v))) {
    fail("--views are top, full, end or a pixel offset");
  }
  const widths = csv(values.widths!).map(Number);
  if (widths.some((w) => !Number.isInteger(w) || w < 200))
    fail("--widths are pixel numbers");
  const timeout = Number(values.timeout);
  if (!(timeout > 0)) fail("--timeout is a number of seconds");

  const options: ShootOptions = {
    base: new URL(values.base),
    out: path.resolve(values.out),
    pages: csv(values.pages!).map((p) => (p.startsWith("/") ? p : `/${p}`)),
    widths,
    schemes: schemes as Array<Scheme>,
    views,
    theme: values.theme,
    themeOptions: values["theme-options"],
    session: values.session,
    locale: values.locale,
    reducedMotion: values["reduced-motion"] ?? false,
    masks: [...DEFAULT_MASKS, ...(values.mask ? [values.mask] : [])],
    concurrency: Math.max(1, Number(values.concurrency) || 2),
    timeout: timeout * 1000,
    scroller: values.scroller,
    clicks: values.click ?? [],
    presses: values.press ?? [],
    hover: values.hover,
    name: values.name,
  };
  await requireAnswer(options.base);
  mkdirSync(options.out, { recursive: true });

  const jobs: Array<[string, number, Scheme]> = [];
  for (const p of options.pages)
    for (const w of options.widths)
      for (const s of options.schemes) jobs.push([p, w, s]);

  const browser = await launch();
  const results: Array<UnitResult> = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const [p, w, s] = jobs[next++]!;
      results.push(await shootUnit(browser, options, p, w, s));
    }
  };
  await Promise.all(Array.from({ length: options.concurrency }, worker));
  await browser.close();

  return report(options, results);
}

/** One line per page and width, then the distinct errors. Returns the exit code. */
function report(options: ShootOptions, results: Array<UnitResult>) {
  const rows: Array<Array<string>> = [
    ["page", "width", "CLS", "overflow", "errors"],
  ];
  for (const p of options.pages) {
    for (const w of options.widths) {
      const own = results.filter((r) => r.page === p && r.width === w);
      const cls = Math.max(...own.map((r) => r.cls));
      const overflow = Math.max(...own.map((r) => r.overflow));
      const count = own.reduce((n, r) => n + r.issues.length, 0);
      rows.push([
        p,
        String(w),
        cls.toFixed(4),
        overflow > 0 ? `yes (+${overflow}px)` : "no",
        String(count),
      ]);
    }
  }
  const widthsOf = rows[0]!.map((_, i) =>
    Math.max(...rows.map((row) => row[i]!.length)),
  );
  for (const row of rows) {
    console.log(
      row
        .map((cell, i) => cell.padEnd(widthsOf[i]!))
        .join("  ")
        .trimEnd(),
    );
  }

  const distinct = new Map<
    string,
    { issue: Issue; where: Set<string>; count: number }
  >();
  for (const r of results) {
    for (const issue of r.issues) {
      const key = `${issue.kind}:${issue.text}`;
      const entry = distinct.get(key) ?? { issue, where: new Set(), count: 0 };
      entry.where.add(r.page);
      entry.count++;
      distinct.set(key, entry);
    }
  }
  if (distinct.size) console.log("");
  for (const { issue, where, count } of distinct.values()) {
    const text = issue.text.replace(/\s+/g, " ").slice(0, 300);
    console.log(
      `[${issue.kind}] ${text}  (${count}x: ${[...where].join(", ")})`,
    );
  }

  const broken = results.some((r) =>
    r.issues.some(
      (i) => i.kind === "pageerror" || i.kind === "http" || i.kind === "load",
    ),
  );
  return broken ? 1 : 0;
}

// ---------------------------------------------------------------- compare

const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function listPngs(dir: string) {
  if (!existsSync(dir)) fail(`${dir} does not exist`);
  return readdirSync(dir)
    .filter((name) => name.endsWith(".png"))
    .sort(byName);
}

/** `image` placed on a larger canvas, the new area opaque magenta. */
function padTo(image: PNG, width: number, height: number) {
  if (image.width === width && image.height === height) return image;
  const canvas = new PNG({ width, height });
  for (let i = 0; i < canvas.data.length; i += 4) {
    canvas.data[i] = 255;
    canvas.data[i + 1] = 0;
    canvas.data[i + 2] = 255;
    canvas.data[i + 3] = 255;
  }
  PNG.bitblt(image, canvas, 0, 0, image.width, image.height, 0, 0);
  return canvas;
}

function compare(args: Array<string>) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      out: { type: "string" },
      threshold: { type: "string", default: "0" },
    },
  });
  const [first, second] = positionals;
  if (!first || !second) fail(USAGE);
  const dirA: string = first;
  const dirB: string = second;
  const threshold = Number(values.threshold);
  if (!(threshold >= 0 && threshold <= 1))
    fail("--threshold is a number from 0 to 1");
  if (values.out) mkdirSync(values.out, { recursive: true });

  const namesA = listPngs(dirA);
  const namesB = new Set<string>(listPngs(dirB));
  let identical = 0;
  let different = 0;
  let unpaired = 0;

  for (const name of namesA) {
    if (!namesB.has(name)) {
      console.log(`${name}: only in ${dirA}`);
      unpaired++;
      continue;
    }
    namesB.delete(name);
    const a = PNG.sync.read(readFileSync(path.join(dirA, name)));
    const b = PNG.sync.read(readFileSync(path.join(dirB, name)));
    const width = Math.max(a.width, b.width);
    const height = Math.max(a.height, b.height);
    const diff = new PNG({ width, height });
    // includeAA counts anti-aliased pixels too: a changed edge is a change.
    const count = pixelmatch(
      padTo(a, width, height).data,
      padTo(b, width, height).data,
      diff.data,
      width,
      height,
      { threshold, includeAA: true },
    );
    const sameSize = a.width === b.width && a.height === b.height;
    if (sameSize && count === 0) {
      identical++;
      continue;
    }
    different++;
    // pixelmatch paints differing pixels pure red; unchanged ones are faded grey.
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (
          diff.data[i] === 255 &&
          diff.data[i + 1] === 0 &&
          diff.data[i + 2] === 0
        ) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    }
    const box = right >= 0 ? `, box x ${left}-${right} y ${top}-${bottom}` : "";
    console.log(
      sameSize
        ? `${name}: ${count} px differ${box}`
        : `${name}: size ${a.width}x${a.height} vs ${b.width}x${b.height}, ${count} px differ${box}`,
    );
    if (values.out) {
      writeFileSync(path.join(values.out, name), PNG.sync.write(diff));
    }
  }
  for (const name of [...namesB].sort(byName)) {
    console.log(`${name}: only in ${dirB}`);
    unpaired++;
  }
  console.log(
    `${identical} identical / ${different} different / ${unpaired} unpaired`,
  );
  return different + unpaired > 0 ? 1 : 0;
}

// ------------------------------------------------------------------ sheet

const SHEET_MAX_WIDTH = 2000;
const SHEET_MAX_HEIGHT = 8000;
const GAP = 12;
const LABEL = 34;

interface Cell {
  file: string;
  name: string;
  /** Displayed size; the height is cut at the sheet limit. */
  width: number;
  height: number;
  cropped: boolean;
  x: number;
  y: number;
}

function sizeOf(file: string) {
  // The PNG header holds the size: no need to decode.
  const head = readFileSync(file).subarray(0, 24);
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

async function sheet(args: Array<string>) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      out: { type: "string" },
      match: { type: "string" },
      columns: { type: "string", default: "2" },
      "cell-width": { type: "string", default: "960" },
      "per-sheet": { type: "string", default: "6" },
    },
  });
  const [dir] = positionals;
  if (!dir || !values.out) fail(USAGE);
  const names = listPngs(dir).filter(
    (n) => !values.match || n.includes(values.match),
  );
  if (!names.length)
    fail(
      `no images in ${dir}${values.match ? ` match "${values.match}"` : ""}`,
    );

  const perSheet = Math.max(1, Number(values["per-sheet"]) || 6);
  const columns = Math.max(
    1,
    Math.min(Number(values.columns) || 2, names.length, perSheet),
  );
  const wanted = Math.max(60, Number(values["cell-width"]) || 960);
  const cellWidth = Math.min(
    wanted,
    Math.floor((SHEET_MAX_WIDTH - GAP * (columns + 1)) / columns),
  );
  const sheetWidth = columns * cellWidth + (columns + 1) * GAP;
  const maxImage = SHEET_MAX_HEIGHT - LABEL - 2 * GAP;

  // Rows of `columns` images; a row is as tall as its tallest image. A new
  // sheet starts when the next row would pass the image or the height limit.
  const sheets: Array<{ cells: Array<Cell>; height: number }> = [];
  let current: { cells: Array<Cell>; height: number } = {
    cells: [],
    height: GAP,
  };
  for (let start = 0; start < names.length; start += columns) {
    const row: Array<Cell> = names.slice(start, start + columns).map((name) => {
      const file = path.resolve(dir, name);
      const natural = sizeOf(file);
      const width = Math.min(natural.width, cellWidth);
      const height = Math.round((natural.height * width) / natural.width);
      return {
        file,
        name,
        width,
        height: Math.min(height, maxImage),
        cropped: height > maxImage,
        x: 0,
        y: 0,
      };
    });
    const rowHeight = LABEL + Math.max(...row.map((c) => c.height)) + GAP;
    if (
      current.cells.length &&
      (current.cells.length + row.length > perSheet ||
        current.height + rowHeight > SHEET_MAX_HEIGHT)
    ) {
      sheets.push(current);
      current = { cells: [], height: GAP };
    }
    row.forEach((cell, i) => {
      cell.x = GAP + i * (cellWidth + GAP);
      cell.y = current.height;
      current.cells.push(cell);
    });
    current.height += rowHeight;
  }
  sheets.push(current);

  const out = path.resolve(values.out);
  mkdirSync(path.dirname(out), { recursive: true });
  const work = mkdtempSync(path.join(tmpdir(), "shots-sheet-"));
  const browser = await launch();
  try {
    const page = await browser.newPage();
    for (const [index, one] of sheets.entries()) {
      const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#e4e4e7;font:12px/16px ui-monospace,Menlo,monospace;color:#18181b;position:relative}
.c{position:absolute}.l{height:${LABEL}px;overflow:hidden;word-break:break-all}
.i{overflow:hidden;outline:1px solid #a1a1aa;background:#fff}img{display:block}</style>
${one.cells
  .map(
    (c) =>
      `<div class="c" style="left:${c.x}px;top:${c.y}px;width:${c.width}px"><div class="l">${escapeHtml(c.name)}${c.cropped ? " (cropped)" : ""}</div><div class="i" style="height:${c.height}px"><img src="${pathToFileURL(c.file).href}" style="width:${c.width}px"></div></div>`,
  )
  .join("\n")}`;
      const htmlFile = path.join(work, `sheet-${index}.html`);
      writeFileSync(htmlFile, html);
      await page.setViewportSize({ width: sheetWidth, height: one.height });
      await page.goto(pathToFileURL(htmlFile).href, { waitUntil: "load" });
      await page.evaluate(() =>
        Promise.all(
          [...document.images].map((img) => img.decode().catch(() => {})),
        ),
      );
      const target =
        sheets.length === 1
          ? out
          : out.replace(/(\.png)?$/, `-${index + 1}.png`);
      await page.screenshot({
        path: target,
        clip: { x: 0, y: 0, width: sheetWidth, height: one.height },
      });
      console.log(
        `wrote ${target} (${sheetWidth}x${one.height}, ${one.cells.length} images)`,
      );
    }
  } finally {
    await browser.close();
    rmSync(work, { recursive: true, force: true });
  }
  return 0;
}

// ------------------------------------------------------------------- main

const [command, ...rest] = process.argv.slice(2);
if (command === "shoot") process.exit(await shoot(rest));
else if (command === "compare") process.exit(compare(rest));
else if (command === "sheet") process.exit(await sheet(rest));
else if (command === "flows") {
  process.exit(await flows(rest, { launch, requireAnswer, fail, csv }));
} else fail(USAGE);
