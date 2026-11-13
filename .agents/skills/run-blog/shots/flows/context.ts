/**
 * What a flow is and what it is given. A flow is one named function in its own
 * file (see `list.ts`): it opens tabs, drives the site, calls `observe` for
 * what it saw and `check` for what must hold. The runner turns that into one
 * line, and `--compare` into the differences between two sites.
 */
import type {
  Browser,
  BrowserContext,
  CDPSession,
  ConsoleMessage,
  Page,
} from "playwright-core";

import type { LocalDb } from "./local-db.ts";

export type Value = string | number | boolean;

/** What a flow needs from the run; a flow missing one is skipped with a line. */
export type Need = "session";

export interface Flow {
  /** What `--only` takes: lowercase words joined by hyphens. */
  name: string;
  /** One line: what the flow checks. */
  summary: string;
  needs?: ReadonlyArray<Need>;
  /** Milliseconds the flow may run; the default is 120 s. */
  timeoutMs?: number;
  run(ctx: FlowContext): Promise<void>;
}

/** A request the page made, with its answer once there is one. */
export interface Recorded {
  /** `Date.now()` when it was sent. */
  at: number;
  method: string;
  url: URL;
  status?: number;
}

export interface Tab {
  page: Page;
  context: BrowserContext;
  /** Every request this tab sent, in order. */
  requests: Array<Recorded>;
  /** The texts of the toasts on screen (sonner renders `[data-sonner-toast]`). */
  toasts(): Promise<Array<string>>;
  /** Waits for a toast, up to `timeoutMs`; returns the toasts on screen, none after the time. */
  waitForToast(timeoutMs?: number): Promise<Array<string>>;
  /** Slows this tab's network the way the earlier hand-written scripts did. */
  throttle(): Promise<CDPSession>;
}

export interface OpenOptions {
  width?: number;
  height?: number;
  /** Signed in with the run's session or API key. */
  signedIn?: boolean;
}

export interface FlowContext {
  readonly base: URL;
  readonly browser: Browser;
  /** The run has a session or an API key to sign tabs in with. */
  readonly canSignIn: boolean;
  /** The run has a `--session` cookie (not only an API key). */
  readonly hasCookie: boolean;
  /** The cookie value of `--session`. */
  readonly sessionCookie: string | undefined;
  /**
   * The local database, when the site is a local dev server and the session is
   * its throwaway Admin; undefined otherwise. A session a flow ends (a logout)
   * is put back after the flow.
   */
  readonly db: LocalDb | undefined;
  /** Opens a tab in a context of its own, closed when the flow ends. */
  open(options?: OpenOptions): Promise<Tab>;
  /** Records a fact. Values of keys ending in `Ms` are timings, compared with a tolerance. */
  observe(key: string, value: Value): void;
  /** Records a problem when `ok` is false and goes on. */
  check(ok: boolean, problem: string): void;
  /** An absolute URL on the site. */
  url(path: string): string;
}

/** A problem found by watching a page, rather than by a check of a flow. */
export interface Noise {
  kind: "pageerror" | "console" | "hydration";
  text: string;
  /** The page's path when it happened. */
  at?: string;
}

/**
 * What a flow's pages may log without failing it, each with its reason:
 *  - a resource that fails to load from another origin (an external image
 *    that does not resolve): the browser logs it as a
 *    console error, and the site cannot do anything about it;
 *  - a third-party iframe's permissions-policy message (an embedded video
 *    asking for a feature the page did not grant).
 * A failed load from the site's own origin is not ignored.
 */
export function isIgnoredNoise(message: ConsoleMessage, origin: string) {
  const text = message.text();
  if (/^Failed to load resource/i.test(text)) {
    const from = message.location().url;
    return from ? new URL(from, origin).origin !== origin : false;
  }
  return /permissions? policy|Unrecognized feature|Allow attribute will take precedence/i.test(
    text,
  );
}

/** React reports a mismatch as a console error, older builds as a warning. */
export function noiseOf(
  message: ConsoleMessage,
  origin: string,
): Noise | undefined {
  const text = message.text();
  const type = message.type();
  const hydration = /hydrat/i.test(text);
  if (type !== "error" && !(hydration && type === "warning")) return undefined;
  if (isIgnoredNoise(message, origin)) return undefined;
  return { kind: hydration ? "hydration" : "console", text };
}

/** Texts of the toasts on screen. */
export function readToasts(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("[data-sonner-toast]")].map(
      (toast) => toast.textContent?.trim() ?? "",
    ),
  );
}
