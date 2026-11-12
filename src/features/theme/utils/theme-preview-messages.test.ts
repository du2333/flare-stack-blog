// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listenForThemePreviewUpdates,
  onThemePreviewReady,
  postThemePreviewUpdate,
  readThemePreviewUpdate,
  THEME_PREVIEW_READY,
  THEME_PREVIEW_UPDATE,
  type PreviewWindow,
  type ThemePreviewLiveFields,
} from "./theme-preview-messages";
import {
  clearThemePreviewLive,
  useThemePreviewLive,
  useThemePreviewMessages,
} from "./theme-preview-live";

const ORIGIN = "https://blog.example";

/** A preview page embedded by `parent`, standing in for an iframe's window. */
function embeddedPage() {
  const parent = { postMessage: vi.fn() };
  const page = Object.assign(new EventTarget(), {
    parent,
    location: { origin: ORIGIN },
  });
  vi.spyOn(page, "addEventListener");
  vi.spyOn(page, "removeEventListener");
  return { page: page as typeof page & PreviewWindow, parent };
}

/** What the browser delivers when `source` posts `data` from `origin`. */
function messageEvent(data: unknown, origin: string, source: unknown) {
  const event = new Event("message");
  Object.defineProperties(event, {
    data: { value: data },
    origin: { value: origin },
    source: { value: source },
  });
  return event as MessageEvent;
}

/** The message `postThemePreviewUpdate` sends, as the preview receives it. */
function sentUpdate(fields: Record<string, unknown>): unknown {
  const frame = { postMessage: vi.fn() };
  // Out-of-range values too, as a careless sender would.
  postThemePreviewUpdate(frame, fields as ThemePreviewLiveFields, ORIGIN);
  return frame.postMessage.mock.calls[0]?.[0];
}

afterEach(() => clearThemePreviewLive());

describe("postThemePreviewUpdate", () => {
  it("posts the typed update to the frame, for a page on the given origin only", () => {
    const frame = { postMessage: vi.fn() };
    postThemePreviewUpdate(frame, { primaryHue: 120 }, ORIGIN);
    expect(frame.postMessage).toHaveBeenCalledWith(
      { type: THEME_PREVIEW_UPDATE, fields: { primaryHue: 120 } },
      ORIGIN,
    );
  });
});

describe("readThemePreviewUpdate", () => {
  const update = sentUpdate({
    bannerFocus: { x: 85, y: 15 },
    primaryHue: 120,
  });

  it("accepts an update from the embedding page on the same origin", () => {
    const { page, parent } = embeddedPage();
    expect(
      readThemePreviewUpdate(messageEvent(update, ORIGIN, parent), page),
    ).toEqual({ bannerFocus: { x: 85, y: 15 }, primaryHue: 120 });
  });

  it("ignores one from another origin or another window", () => {
    const { page, parent } = embeddedPage();
    expect(
      readThemePreviewUpdate(
        messageEvent(update, "https://evil.example", parent),
        page,
      ),
    ).toBeNull();
    for (const source of [{ postMessage: vi.fn() }, page, null]) {
      expect(
        readThemePreviewUpdate(messageEvent(update, ORIGIN, source), page),
      ).toBeNull();
    }
  });

  it("ignores one on a page nothing embeds", () => {
    const topLevel = { location: { origin: ORIGIN }, parent: null as unknown };
    topLevel.parent = topLevel;
    expect(
      readThemePreviewUpdate(messageEvent(update, ORIGIN, topLevel), topLevel),
    ).toBeNull();
  });

  it("keeps only the valid fields of a well-formed update", () => {
    const { page, parent } = embeddedPage();
    const read = (data: unknown) =>
      readThemePreviewUpdate(messageEvent(data, ORIGIN, parent), page);
    expect(
      read(sentUpdate({ bannerFocus: { x: 101, y: 0 }, primaryHue: 0 })),
    ).toEqual({ primaryHue: 0 });
    expect(read(sentUpdate({ primaryHue: 361 }))).toBeNull();
    expect(read({ type: "other", fields: { primaryHue: 1 } })).toBeNull();
    expect(read({ type: THEME_PREVIEW_UPDATE })).toBeNull();
    expect(read("primaryHue=1")).toBeNull();
  });
});

describe("listenForThemePreviewUpdates", () => {
  it("hands accepted updates on, tells the parent it is ready, and stops", () => {
    const { page, parent } = embeddedPage();
    const onUpdate = vi.fn();
    const stop = listenForThemePreviewUpdates(onUpdate, page);
    expect(parent.postMessage).toHaveBeenCalledWith(
      { type: THEME_PREVIEW_READY },
      ORIGIN,
    );

    page.dispatchEvent(
      messageEvent(sentUpdate({ primaryHue: 30 }), ORIGIN, parent),
    );
    page.dispatchEvent(
      messageEvent(
        sentUpdate({ primaryHue: 60 }),
        "https://evil.example",
        parent,
      ),
    );
    expect(onUpdate.mock.calls).toEqual([[{ primaryHue: 30 }]]);

    stop();
    page.dispatchEvent(
      messageEvent(sentUpdate({ primaryHue: 90 }), ORIGIN, parent),
    );
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});

describe("onThemePreviewReady", () => {
  it("answers the preview it embeds on the same origin only", () => {
    const admin = Object.assign(new EventTarget(), {
      location: { origin: ORIGIN },
    });
    const frame = {};
    const onReady = vi.fn();
    const stop = onThemePreviewReady(
      () => frame,
      onReady,
      admin as typeof admin & PreviewWindow,
    );
    const ready = { type: THEME_PREVIEW_READY };

    admin.dispatchEvent(messageEvent(ready, ORIGIN, frame));
    admin.dispatchEvent(messageEvent(ready, "https://evil.example", frame));
    admin.dispatchEvent(messageEvent(ready, ORIGIN, {}));
    expect(onReady).toHaveBeenCalledTimes(1);
    stop();
    admin.dispatchEvent(messageEvent(ready, ORIGIN, frame));
    expect(onReady).toHaveBeenCalledTimes(1);
  });
});

describe("useThemePreviewMessages", () => {
  function renderPage(previewing: boolean) {
    const { page, parent } = embeddedPage();
    const view = renderHook(
      ({ on }) => {
        useThemePreviewMessages(on, page);
        return {
          hue: useThemePreviewLive("primaryHue"),
          focus: useThemePreviewLive("bannerFocus"),
        };
      },
      { initialProps: { on: previewing } },
    );
    const send = (fields: Record<string, unknown>) =>
      act(() => {
        page.dispatchEvent(messageEvent(sentUpdate(fields), ORIGIN, parent));
      });
    return { page, view, send };
  }

  it("installs no listener on a page that is not a preview", async () => {
    const { page, view, send } = renderPage(false);
    await act(async () => {});
    send({ primaryHue: 30 });
    expect(page.addEventListener).not.toHaveBeenCalled();
    expect(view.result.current).toEqual({ hue: undefined, focus: undefined });
  });

  it("follows the embedding page while previewing and forgets on leaving", async () => {
    const { page, view, send } = renderPage(true);
    await waitFor(() => expect(page.addEventListener).toHaveBeenCalled());

    send({ primaryHue: 30 });
    send({ bannerFocus: { x: 85, y: 15 } });
    expect(view.result.current).toEqual({
      hue: 30,
      focus: { x: 85, y: 15 },
    });

    view.rerender({ on: false });
    expect(page.removeEventListener).toHaveBeenCalled();
    expect(view.result.current).toEqual({ hue: undefined, focus: undefined });
  });
});
