// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  THEME_PREVIEW_DRAFT_PARAM,
  THEME_PREVIEW_OPTIONS_PARAM,
  THEME_PREVIEW_PARAM,
} from "@/features/theme/utils/theme-preview-params";
import {
  PREVIEW_DEBOUNCE_MS,
  previewAddress,
  usePreviewAddress,
  type PreviewTarget,
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
const home: PreviewTarget = { kind: "home" };

const draftOf = (address: string) =>
  JSON.parse(
    new URL(address, "https://blog.example").searchParams.get(
      THEME_PREVIEW_DRAFT_PARAM,
    )!,
  );

describe("previewAddress", () => {
  it("is the home page with the Theme, its options and the draft", () => {
    const address = previewAddress(
      { ...values, themeOptions: { cards: "below" } },
      home,
    );
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

  it("is marked as embedded, on a Post's path too, so the page shows no preview bar", () => {
    for (const target of [
      home,
      { kind: "post", path: "/post/a-post" },
    ] as const) {
      const url = new URL(
        previewAddress(values, target),
        "https://blog.example",
      );
      expect(url.searchParams.get("themePreviewEmbed")).toBe("1");
    }
  });

  it("puts the same parameters on the path of a Post", () => {
    const post = previewAddress(values, { kind: "post", path: "/post/a-post" });
    const url = new URL(post, "https://blog.example");
    expect(url.pathname).toBe("/post/a-post");
    expect(url.search).toBe(
      new URL(previewAddress(values, home), "https://blog.example").search,
    );
  });
});

describe("usePreviewAddress", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function render(initial: PreviewValues = values) {
    return renderHook(
      (props: { values: PreviewValues; target: PreviewTarget }) =>
        usePreviewAddress(props.values, props.target),
      { initialProps: { values: initial, target: home } },
    );
  }
  const wait = (ms = PREVIEW_DEBOUNCE_MS) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });

  it("starts at the address of the values", () => {
    const { result } = render();
    expect(result.current).toBe(previewAddress(values, home));
  });

  it("gives no new address for a banner focus or a hue change: the preview follows in place", () => {
    const { result, rerender } = render();
    const first = result.current;
    rerender({
      values: { ...values, bannerFocus: { x: 20, y: 70 }, primaryHue: 10 },
      target: home,
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
      rerender({ values: { ...values, ...change }, target: home });
      expect(result.current).toBe(first);
      wait(PREVIEW_DEBOUNCE_MS - 1);
      expect(result.current).toBe(first);
      wait(1);
      expect(result.current).not.toBe(first);
      expect(result.current).toBe(
        previewAddress({ ...values, ...change }, home),
      );
    },
  );

  it("builds the new address with the latest focus and hue", () => {
    const { result, rerender } = render();
    rerender({ values: { ...values, tagline: "Other" }, target: home });
    // Dragged and moved while the change was waiting.
    rerender({
      values: {
        ...values,
        tagline: "Other",
        bannerFocus: { x: 5, y: 95 },
        primaryHue: 330,
      },
      target: home,
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
      rerender({ values: { ...values, tagline }, target: home });
      wait(PREVIEW_DEBOUNCE_MS - 100);
    }
    expect(result.current).toBe(first);
    wait(100);
    expect(draftOf(result.current).tagline).toBe("Oth");
  });

  it("changes at once for another page, with the latest focus and hue", () => {
    const { result, rerender } = render();
    const dragged = { ...values, bannerFocus: { x: 1, y: 2 }, primaryHue: 99 };
    rerender({ values: dragged, target: home });
    rerender({
      values: dragged,
      target: { kind: "post", path: "/post/a-post" },
    });
    const url = new URL(result.current, "https://blog.example");
    expect(url.pathname).toBe("/post/a-post");
    expect(draftOf(result.current)).toMatchObject({
      bannerFocus: { x: 1, y: 2 },
      primaryHue: 99,
    });
  });

  it("does not load again for a change that was already built in", () => {
    const { result, rerender } = render();
    rerender({ values: { ...values, tagline: "Other" }, target: home });
    rerender({
      values: { ...values, tagline: "Other" },
      target: { kind: "post", path: "/post/a-post" },
    });
    const built = result.current;
    // The focus moves before the wait for the tagline is over.
    rerender({
      values: { ...values, tagline: "Other", bannerFocus: { x: 3, y: 4 } },
      target: { kind: "post", path: "/post/a-post" },
    });
    wait(PREVIEW_DEBOUNCE_MS * 2);
    expect(result.current).toBe(built);
  });
});
