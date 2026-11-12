// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CONFIG,
  type SystemConfig,
} from "@/features/config/config.schema";
import { THEME_PREVIEW_UPDATE } from "@/features/theme/utils/theme-preview-messages";
import { m } from "@/paraglide/messages";
import { PREVIEW_DEBOUNCE_MS } from "./preview-address";
import { PersonalizeStudio } from "./personalize-studio";
import { PREVIEW_LOAD_TIMEOUT_MS } from "./preview-stage";

vi.mock("@/lib/orpc", () => ({
  orpcClient: { config: { admin: { uploadAsset: vi.fn() } } },
}));
vi.mock("@/features/posts/queries", () => ({
  adminPostsQuery: () => ({
    queryKey: ["admin-posts", "newest-published"],
    queryFn: async () => ({ items: [{ publicSlug: "a-post" }] }),
  }),
}));

let wide = true;
let queued: Array<() => void> = [];
/** Runs what was asked of the next animation frame. */
const nextFrame = () =>
  act(() => {
    const due = queued;
    queued = [];
    for (const callback of due) callback();
  });
beforeEach(() => {
  wide = true;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("min-width: 1280px") ? wide : false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  queued = [];
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
    queued.push(callback);
    return queued.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  HTMLElement.prototype.scrollTo = vi.fn();
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: vi.fn(() => ({ cancel: vi.fn() })),
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderStudio() {
  const form: { current?: UseFormReturn<SystemConfig> } = {};
  function Harness({ children }: { children: ReactNode }) {
    const methods = useForm<SystemConfig>({
      defaultValues: structuredClone(DEFAULT_CONFIG),
    });
    form.current = methods;
    return createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(FormProvider<SystemConfig>, { ...methods, children }),
    );
  }
  render(createElement(Harness, null, createElement(PersonalizeStudio)));
  return () => form.current!;
}

const frames = () =>
  Array.from(document.querySelectorAll<HTMLIFrameElement>("iframe"));
const shown = () => frames().filter((frame) => frame.dataset.shown);
const paramsOf = (frame: HTMLIFrameElement) =>
  new URL(frame.getAttribute("src")!, "https://blog.example");
const draftOf = (frame: HTMLIFrameElement) =>
  JSON.parse(paramsOf(frame).searchParams.get("themePreviewDraft")!);

/** The preview finishing a load, as the browser reports it. */
const loaded = (frame: HTMLIFrameElement) =>
  act(() => {
    fireEvent.load(frame);
  });
const wait = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

describe("on a wide screen", () => {
  it("shows the form with the preview beside it, one frame with a title that takes no focus", async () => {
    renderStudio();
    expect(
      await screen.findByRole("region", {
        name: m.personalize_preview_heading(),
      }),
    ).toBeTruthy();
    const [frame, ...others] = frames();
    expect(others).toEqual([]);
    expect(frame.getAttribute("title")).toBe(
      m.personalize_preview_frame_title(),
    );
    expect(frame.tabIndex).toBe(-1);
    expect(frame.hasAttribute("autofocus")).toBe(false);
    expect(paramsOf(frame).pathname).toBe("/");
    expect(
      screen.getByRole("radiogroup", { name: m.settings_theme() }),
    ).toBeTruthy();
    // The identity fields are not here.
    expect(screen.queryByLabelText(m.settings_site_field_title())).toBeNull();
  });

  it("follows the hue and the banner focus in place: a message, no new frame, no new address", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const form = renderStudio();
    const [frame] = frames();
    const src = frame.getAttribute("src");
    const post = vi.spyOn(frame.contentWindow!, "postMessage");
    nextFrame();
    post.mockClear();

    fireEvent.change(document.getElementById("theme-hue-slider")!, {
      target: { value: "120" },
    });
    nextFrame();
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({
        type: THEME_PREVIEW_UPDATE,
        fields: expect.objectContaining({ primaryHue: 120 }),
      }),
      window.location.origin,
    );

    post.mockClear();
    act(() => {
      form().setValue(
        "site.bannerFocus",
        { x: 10, y: 20 },
        { shouldDirty: true },
      );
    });
    nextFrame();
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({
        type: THEME_PREVIEW_UPDATE,
        fields: {
          bannerFocus: { x: 10, y: 20 },
          primaryHue: 120,
        },
      }),
      window.location.origin,
    );
    await wait(PREVIEW_DEBOUNCE_MS * 3);
    expect(frames()).toHaveLength(1);
    expect(frames()[0].getAttribute("src")).toBe(src);
  });

  it("reloads in a second frame after a short wait when the Theme changes, keeping the old one in view until the new one has loaded", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const form = renderStudio();
    const [first] = frames();
    loaded(first);
    act(() => {
      form().setValue("site.primaryHue", 77);
    });

    const themes = screen.getByRole("radiogroup", { name: m.settings_theme() });
    fireEvent.click(
      within(themes).getByRole("radio", { name: m.theme_immersive_name() }),
    );
    expect(frames()).toHaveLength(1);
    await wait(PREVIEW_DEBOUNCE_MS);

    expect(frames()).toHaveLength(2);
    const [, second] = frames();
    expect(paramsOf(second).searchParams.get("themePreview")).toBe("immersive");
    // The address carries the latest hue.
    expect(draftOf(second).primaryHue).toBe(77);
    // Loading: the old frame is still the one in view.
    expect(shown()).toEqual([first]);
    expect(
      screen
        .getByText(m.personalize_preview_loading())
        .closest("[role=status]"),
    ).toBeTruthy();

    loaded(second);
    expect(frames()).toEqual([second]);
    expect(shown()).toEqual([second]);
    expect(screen.queryByText(m.personalize_preview_loading())).toBeNull();
  });

  it("reloads for a Theme option and for the tagline too", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    renderStudio();
    loaded(frames()[0]);
    fireEvent.change(screen.getByLabelText(m.settings_tagline()), {
      target: { value: "Hello" },
    });
    await wait(PREVIEW_DEBOUNCE_MS);
    expect(frames()).toHaveLength(2);
    expect(draftOf(frames()[1]).tagline).toBe("Hello");
  });

  it("switches between the desktop and the phone frame without a new address, and to a Post", async () => {
    renderStudio();
    const [frame] = frames();
    loaded(frame);
    expect(frame.style.width).toBe("1280px");
    fireEvent.click(
      screen.getByRole("radio", { name: m.personalize_preview_device_phone() }),
    );
    expect(frames()).toHaveLength(1);
    expect(frames()[0].style.width).toBe("390px");

    // The newest published Post is found once the page is open.
    const post = await screen.findByRole("radio", {
      name: m.personalize_preview_page_post(),
    });
    fireEvent.click(post);
    expect(frames()).toHaveLength(2);
    const url = paramsOf(frames()[1]);
    expect(url.pathname).toBe("/post/a-post");
    expect(url.searchParams.get("themePreview")).toBe("classic");
  });

  it("offers a retry when a load fails, and the form stays usable", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const form = renderStudio();
    await wait(PREVIEW_LOAD_TIMEOUT_MS);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain(m.personalize_preview_failed());
    fireEvent.change(screen.getByLabelText(m.settings_tagline()), {
      target: { value: "Still editable" },
    });
    expect(form().getValues("site.tagline")).toBe("Still editable");

    const before = frames();
    fireEvent.click(
      within(alert).getByRole("button", {
        name: m.personalize_preview_retry(),
      }),
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(frames()).toHaveLength(1);
    expect(frames()[0]).not.toBe(before[0]);
    loaded(frames()[0]);
    expect(shown()).toEqual(frames());
  });
});

describe("on a narrow screen", () => {
  it("loads nothing until the preview button is used, then opens it over the screen and closes back", async () => {
    wide = false;
    renderStudio();
    expect(frames()).toEqual([]);
    expect(
      screen.queryByRole("region", { name: m.personalize_preview_heading() }),
    ).toBeNull();

    const open = screen.getByRole("button", {
      name: m.personalize_preview_open(),
    });
    open.focus();
    fireEvent.click(open);
    const dialog = await screen.findByRole("dialog", {
      name: m.personalize_preview_heading(),
    });
    expect(
      within(dialog).getAllByTitle(m.personalize_preview_frame_title()),
    ).toHaveLength(1);
    // A phone's screen shows the phone frame.
    expect(frames()[0].style.width).toBe("390px");

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: m.personalize_preview_close(),
      }),
    );
    expect(document.activeElement).toBe(open);
  });
});
