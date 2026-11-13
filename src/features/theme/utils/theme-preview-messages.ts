import {
  BannerFocusSchema,
  PrimaryHueSchema,
  type SiteConfig,
} from "@/features/config/site-config.schema";

/**
 * Messages between an Admin page and the Theme preview it embeds in an
 * iframe, for the two continuous controls: the banner focus and the primary
 * hue follow without reloading the preview. Every other field changes the
 * preview address (`themePreviewHref`), which reloads it.
 *
 * The preview accepts an update only from its parent window on its own
 * origin, and only while it is a preview; it says when it is ready, after
 * each load, so the Admin page can send the values it holds.
 */
export const THEME_PREVIEW_UPDATE = "flare:theme-preview:update";
export const THEME_PREVIEW_READY = "flare:theme-preview:ready";

/** The fields a preview updates in place. */
export type ThemePreviewLiveFields = Partial<
  Pick<SiteConfig, "bannerFocus" | "primaryHue">
>;

export interface ThemePreviewUpdateMessage {
  type: typeof THEME_PREVIEW_UPDATE;
  fields: ThemePreviewLiveFields;
}

export interface ThemePreviewReadyMessage {
  type: typeof THEME_PREVIEW_READY;
}

/** What of a window the preview side needs; `window` is one. */
export interface PreviewWindow {
  readonly location: { readonly origin: string };
  readonly parent: unknown;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: MessageEvent) => void,
  ): void;
}

type ReceivedMessage = Pick<MessageEvent, "data" | "origin" | "source">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Admin side: sends live fields to the preview in `frame`, the iframe's
 * `contentWindow`. Only a page on `origin` receives it.
 */
export function postThemePreviewUpdate(
  frame: Pick<Window, "postMessage">,
  fields: ThemePreviewLiveFields,
  origin: string = window.location.origin,
): void {
  const message: ThemePreviewUpdateMessage = {
    type: THEME_PREVIEW_UPDATE,
    fields,
  };
  frame.postMessage(message, origin);
}

/**
 * Admin side: calls `onReady` each time the preview in `frame` has loaded and
 * listens, so the values already set can be sent again. Returns the stop.
 */
export function onThemePreviewReady(
  frame: () => unknown,
  onReady: () => void,
  page: Pick<
    PreviewWindow,
    "location" | "addEventListener" | "removeEventListener"
  > = window,
): () => void {
  const listener = (event: MessageEvent) => {
    if (event.origin !== page.location.origin) return;
    if (event.source === null || event.source !== frame()) return;
    if (isRecord(event.data) && event.data.type === THEME_PREVIEW_READY) {
      onReady();
    }
  };
  page.addEventListener("message", listener);
  return () => page.removeEventListener("message", listener);
}

/**
 * Preview side: the live fields an event carries, or null when the event is
 * not an update from the embedding page: another origin, a window other than
 * the parent, a page that is not embedded, or no valid field.
 */
export function readThemePreviewUpdate(
  event: ReceivedMessage,
  page: Pick<PreviewWindow, "location" | "parent">,
): ThemePreviewLiveFields | null {
  if (page.parent === page) return null;
  if (event.origin !== page.location.origin) return null;
  if (event.source === null || event.source !== page.parent) return null;
  const data: unknown = event.data;
  if (!isRecord(data) || data.type !== THEME_PREVIEW_UPDATE) return null;
  if (!isRecord(data.fields)) return null;

  const fields: ThemePreviewLiveFields = {};
  const bannerFocus = BannerFocusSchema.safeParse(data.fields.bannerFocus);
  if (bannerFocus.success) fields.bannerFocus = bannerFocus.data;
  const primaryHue = PrimaryHueSchema.safeParse(data.fields.primaryHue);
  if (primaryHue.success) fields.primaryHue = primaryHue.data;
  return Object.keys(fields).length > 0 ? fields : null;
}

/**
 * Preview side: hands each accepted update to `onUpdate` and tells the
 * embedding page it is ready. Install it only on a preview. Returns the stop.
 */
export function listenForThemePreviewUpdates(
  onUpdate: (fields: ThemePreviewLiveFields) => void,
  page: PreviewWindow = window,
): () => void {
  const listener = (event: MessageEvent) => {
    const fields = readThemePreviewUpdate(event, page);
    if (fields) onUpdate(fields);
  };
  page.addEventListener("message", listener);
  if (page.parent !== page) {
    const ready: ThemePreviewReadyMessage = { type: THEME_PREVIEW_READY };
    (page.parent as Pick<Window, "postMessage">).postMessage(
      ready,
      page.location.origin,
    );
  }
  return () => page.removeEventListener("message", listener);
}
