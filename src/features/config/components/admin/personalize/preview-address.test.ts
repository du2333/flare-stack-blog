// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  THEME_PREVIEW_DRAFT_PARAM,
  THEME_PREVIEW_OPTIONS_PARAM,
  THEME_PREVIEW_PARAM,
} from "@/features/theme/utils/theme-preview-params";
import {
  PREVIEW_DEBOUNCE_MS,
  previewAddress,
  publicPreviewPath,
  usePreviewAddress,
  type PreviewValues,
} from "./preview-address";

const values: PreviewValues = {
  themeId: "classic",
  themeOptions: {},
  bannerImage: "/site/banner.webp",
  bannerFocus: { x: 50, y: 50 },
  avatar: "/site/avatar.png",
  primaryHue: 250,
  brandMark: "default",
  tagline: "Notes",
};

const draftOf = (address: string) =>
  JSON.parse(
    new URL(address, "https://blog.example").searchParams.get(
      THEME_PREVIEW_DRAFT_PARAM,
    )!,
  );

describe("previewAddress", () => {
  it("is the home page with the Theme, its options and the draft", () => {
    const address = previewAddress({
      ...values,
      themeOptions: { cards: "below" },
    });
    const url = new URL(address, "https://blog.example");
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get(THEME_PREVIEW_PARAM)).toBe("classic");
    expect(
      JSON.parse(url.searchParams.get(THEME_PREVIEW_OPTIONS_PARAM)!),
    ).toEqual({ cards: "below" });
    expect(draftOf(address)).toEqual({
      bannerImage: "/site/banner.webp",
      bannerFocus: { x: 50, y: 50 },
      avatar: "/site/avatar.png",
      primaryHue: 250,
      brandMark: "default",
      tagline: "Notes",
    });
  });

  it("is marked as embedded, on any page, so the page shows no preview bar", () => {
    for (const path of ["/", "/post/a-post"]) {
      const url = new URL(previewAddress(values, path), "https://blog.example");
      expect(url.searchParams.get("themePreviewEmbed")).toBe("1");
    }
  });

  it("puts the same parameters on the path of another public page", () => {
    const url = new URL(
      previewAddress(values, "/post/a-post"),
      "https://blog.example",
    );
    expect(url.pathname).toBe("/post/a-post");
    expect(url.search).toBe(
      new URL(previewAddress(values), "https://blog.example").search,
    );
  });

  it("falls back to the home page for a path that is not a public page", () => {
    for (const path of ["/admin/posts", "/api/x", "//evil.example", "post"]) {
      expect(previewAddress(values, path)).toBe(previewAddress(values));
    }
  });
});

describe("publicPreviewPath", () => {
  it("keeps the path of a public page and drops anything else", () => {
    expect(publicPreviewPath("/")).toBe("/");
    expect(publicPreviewPath("/post/a-post")).toBe("/post/a-post");
    expect(publicPreviewPath("/posts")).toBe("/posts");
    expect(publicPreviewPath("/admin")).toBeNull();
    expect(publicPreviewPath("/admin/settings/site")).toBeNull();
    expect(publicPreviewPath("/api/auth/session")).toBeNull();
    expect(publicPreviewPath("//evil.example/x")).toBeNull();
    expect(publicPreviewPath("about:blank")).toBeNull();
    expect(publicPreviewPath(undefined)).toBeNull();
  });
});

describe("usePreviewAddress", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  let path: string | null = null;
  const currentPath = () => path;
  function render(initial: PreviewValues = values) {
    path = null;
    return renderHook(
      (props: { values: PreviewValues }) =>
        usePreviewAddress(props.values, currentPath),
      { initialProps: { values: initial } },
    );
  }
  const wait = (ms = PREVIEW_DEBOUNCE_MS) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });

  it("starts at the home page address of the values", () => {
    const { result } = render();
    expect(result.current).toBe(previewAddress(values));
  });

  it("gives no new address for a banner focus or a hue change: the preview follows in place", () => {
    const { result, rerender } = render();
    const first = result.current;
    rerender({
      values: { ...values, bannerFocus: { x: 20, y: 70 }, primaryHue: 10 },
    });
    wait(PREVIEW_DEBOUNCE_MS * 3);
    expect(result.current).toBe(first);
  });

  it.each([
    ["Theme", { themeId: "immersive" }],
    ["Theme option", { themeOptions: { cards: "beside" } }],
    ["banner image", { bannerImage: "/site/other.webp" }],
    ["avatar", { avatar: "/site/other.png" }],
    ["brand mark", { brandMark: "none" as const }],
    ["tagline", { tagline: "Other" }],
  ])(
    "gives a new address, after a short wait, for a %s change",
    (_, change) => {
      const { result, rerender } = render();
      const first = result.current;
      rerender({ values: { ...values, ...change } });
      expect(result.current).toBe(first);
      wait(PREVIEW_DEBOUNCE_MS - 1);
      expect(result.current).toBe(first);
      wait(1);
      expect(result.current).not.toBe(first);
      expect(result.current).toBe(previewAddress({ ...values, ...change }));
    },
  );

  it("builds the new address with the latest focus and hue", () => {
    const { result, rerender } = render();
    rerender({ values: { ...values, tagline: "Other" } });
    // Dragged and moved while the change was waiting.
    rerender({
      values: {
        ...values,
        tagline: "Other",
        bannerFocus: { x: 5, y: 95 },
        primaryHue: 330,
      },
    });
    wait();
    expect(draftOf(result.current)).toMatchObject({
      tagline: "Other",
      bannerFocus: { x: 5, y: 95 },
      primaryHue: 330,
    });
  });

  it("waits for the last of several quick changes", () => {
    const { result, rerender } = render();
    const first = result.current;
    for (const tagline of ["O", "Ot", "Oth"]) {
      rerender({ values: { ...values, tagline } });
      wait(PREVIEW_DEBOUNCE_MS - 100);
    }
    expect(result.current).toBe(first);
    wait(100);
    expect(draftOf(result.current).tagline).toBe("Oth");
  });

  it("reloads on the page the Admin has navigated to in the preview", () => {
    const { result, rerender } = render();
    path = "/post/a-post";
    rerender({ values: { ...values, themeId: "immersive" } });
    wait();
    const url = new URL(result.current, "https://blog.example");
    expect(url.pathname).toBe("/post/a-post");
    expect(url.searchParams.get(THEME_PREVIEW_PARAM)).toBe("immersive");
  });

  it("reloads on the home page when the path cannot be read or is not a public page", () => {
    const { result, rerender } = render();
    path = null;
    rerender({ values: { ...values, tagline: "A" } });
    wait();
    expect(new URL(result.current, "https://blog.example").pathname).toBe("/");
    path = "/admin/settings";
    rerender({ values: { ...values, tagline: "B" } });
    wait();
    expect(new URL(result.current, "https://blog.example").pathname).toBe("/");
  });
});
