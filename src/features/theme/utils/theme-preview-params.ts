import type { SiteConfigDraft } from "../site-config-draft";

/**
 * A Theme preview is asked for on a public address: `themePreview` names the
 * Theme, `themePreviewOptions` carries its options as JSON, and
 * `themePreviewDraft` may carry unsaved presentation fields of Site Config as
 * JSON (`SiteConfigDraft`). Only an Admin's request renders it, and none is
 * ever cached (`workersCacheRoute`). Kept apart from the registry so the
 * default fetch handler can read the names without loading the shells.
 */
export const THEME_PREVIEW_PARAM = "themePreview";
export const THEME_PREVIEW_OPTIONS_PARAM = "themePreviewOptions";
export const THEME_PREVIEW_DRAFT_PARAM = "themePreviewDraft";
/**
 * Set by the Admin page that embeds a preview in an iframe. The server sees
 * it, so the preview renders without its own bar from the first paint.
 */
export const THEME_PREVIEW_EMBED_PARAM = "themePreviewEmbed";

const PREVIEW_PARAMS = [
  THEME_PREVIEW_PARAM,
  THEME_PREVIEW_OPTIONS_PARAM,
  THEME_PREVIEW_DRAFT_PARAM,
  THEME_PREVIEW_EMBED_PARAM,
];

/** Whether the address asks for a preview, whatever the values say. */
export function hasThemePreviewParams(url: URL): boolean {
  return PREVIEW_PARAMS.some((name) => url.searchParams.has(name));
}

export function withoutThemePreviewParams(url: URL): URL {
  const next = new URL(url);
  for (const name of PREVIEW_PARAMS) next.searchParams.delete(name);
  return next;
}

// Better Auth's session cookie, with the prefix it adds on HTTPS.
const SESSION_COOKIE = /(?:^|;)\s*(?:__Secure-)?better-auth\.session_token=/;

/**
 * Whether the request carries a session cookie at all. Only a hint for the
 * cache decision: whether it belongs to an Admin is checked while rendering.
 */
export function hasSessionCookie(headers: Headers): boolean {
  return SESSION_COOKIE.test(headers.get("Cookie") ?? "");
}

/**
 * The home page showing a Theme with these options and, when given, a draft
 * of the presentation fields in place of the saved ones.
 */
export function themePreviewHref(
  themeId: string,
  options: Readonly<Record<string, unknown>>,
  draft?: Readonly<SiteConfigDraft>,
): string {
  const search = new URLSearchParams({
    [THEME_PREVIEW_PARAM]: themeId,
    [THEME_PREVIEW_OPTIONS_PARAM]: JSON.stringify(options),
  });
  if (draft && Object.keys(draft).length > 0) {
    search.set(THEME_PREVIEW_DRAFT_PARAM, JSON.stringify(draft));
  }
  return `/?${search}`;
}

/** The address of a preview, marked as embedded in an Admin page. */
export function embeddedThemePreviewHref(href: string): string {
  const url = new URL(href, "http://preview.local");
  url.searchParams.set(THEME_PREVIEW_EMBED_PARAM, "1");
  return `${url.pathname}${url.search}`;
}

/** Whether the preview is embedded in an Admin page, by its search. */
export function isThemePreviewEmbedded(
  search: Readonly<Record<string, unknown>>,
): boolean {
  return search[THEME_PREVIEW_EMBED_PARAM] !== undefined;
}

/**
 * The search of a client-side navigation while previewing: the preview
 * parameters stay unless the navigation names them, which leaving the preview
 * does by setting them to undefined.
 */
export function carryThemePreview(
  from: Readonly<Record<string, unknown>>,
  next: Record<string, unknown>,
): Record<string, unknown> {
  if (from[THEME_PREVIEW_PARAM] === undefined) return next;
  if (PREVIEW_PARAMS.some((name) => name in next)) return next;
  const carried = { ...next };
  for (const name of PREVIEW_PARAMS) {
    if (from[name] !== undefined) carried[name] = from[name];
  }
  return carried;
}

export function withoutThemePreview(
  search: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return {
    ...search,
    [THEME_PREVIEW_PARAM]: undefined,
    [THEME_PREVIEW_OPTIONS_PARAM]: undefined,
    [THEME_PREVIEW_DRAFT_PARAM]: undefined,
    [THEME_PREVIEW_EMBED_PARAM]: undefined,
  };
}

export function searchHasThemePreview(
  search: Readonly<Record<string, unknown>>,
): boolean {
  return PREVIEW_PARAMS.some((name) => search[name] !== undefined);
}
