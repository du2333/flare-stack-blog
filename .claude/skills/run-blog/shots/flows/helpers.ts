/** What several flows share: where things are on the page and what was requested. */
import type { Page } from "playwright-core";
import type { FlowContext, Recorded, Tab } from "./context.ts";

/** Chunks of the auth client; the public pages must not load them for a reader who is not signed in. */
export const AUTH_CLIENT =
  /better-auth|better-fetch|nanostores|auth-client|api-key/;
/** Chunks of the toast library (the facade `src/lib/toast.ts` does not match). */
export const TOAST_LIBRARY = /sonner|\/toaster[.-]/i;

/** A Post's link in the page's content, not the site navigation's (which may point at a Post too). */
export const POST_LINK =
  'main a[href^="/post/"]:visible, article a[href^="/post/"]:visible';

export const accountTrigger = (page: Page) =>
  page.locator(".public-account-trigger, .immersive-account").first();

export const accountLabel = (page: Page) =>
  accountTrigger(page).getAttribute("aria-label");

/** Opens the public account menu, reads it, closes it. */
export async function readAccountMenu(page: Page) {
  await accountTrigger(page).click();
  const panel = page.locator(
    "#public-navigation-panel, #immersive-navigation-panel",
  );
  await panel.first().waitFor({ state: "visible", timeout: 10000 });
  const identityRow = panel.locator(".public-menu-identity").first();
  const identity = (await identityRow.count())
    ? await identityRow.innerText()
    : "";
  const adminEntry = (await panel.locator('a[href="/admin"]').count()) > 0;
  const loginEntry = (await panel.locator('a[href="/login"]').count()) > 0;
  await page.keyboard.press("Escape");
  await panel
    .first()
    .waitFor({ state: "hidden", timeout: 5000 })
    .catch(() => {});
  return { identity: identity.trim(), adminEntry, loginEntry };
}

/** Clicks the logout row of the open account menu. */
export async function logOut(page: Page) {
  await accountTrigger(page).click();
  await page.locator(".public-menu-logout").first().click();
}

export const sessionCookie = (ctx: FlowContext) => ({
  name: "better-auth.session_token",
  value: ctx.sessionCookie ?? "",
  domain: ctx.base.hostname,
  path: "/",
});

/** The Posts of the list page, as paths, in the order the page shows them. */
export async function postPaths(ctx: FlowContext) {
  const html = await (await fetch(ctx.url("/posts"))).text();
  return [
    ...new Set(
      [...html.matchAll(/href="(\/post\/[^"#?]+)"/g)].map((m) => m[1]!),
    ),
  ];
}

/** Requests of a tab whose URL matches, optionally only those sent at or after `since`. */
export function requested(
  tab: Tab,
  pattern: RegExp,
  since = 0,
): Array<Recorded> {
  return tab.requests.filter(
    (request) =>
      request.at >= since &&
      pattern.test(request.url.pathname + request.url.search) &&
      !request.url.pathname.startsWith("/src/routes/"),
  );
}

/** A request to the site's API: oRPC under `/api/`, server functions under `/_serverFn/`. */
export const API_CALL = /^\/(api|_serverFn)\//;

/** Waits for the page's network to be quiet, then a moment more for late requests. */
export async function settle(page: Page, extraMs = 2000) {
  await page
    .waitForLoadState("networkidle", { timeout: 10000 })
    .catch(() => {});
  await page.waitForTimeout(extraMs);
}

/** The title of the error or not-found page on screen (`StatusPage`), or undefined. */
export async function statusPageTitle(page: Page) {
  const title = page.locator(".site-status h1").first();
  return (await title.count())
    ? ((await title.textContent())?.trim() ?? "")
    : undefined;
}
