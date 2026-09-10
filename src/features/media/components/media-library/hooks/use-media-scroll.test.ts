// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useMediaScroll } from "./use-media-scroll";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 16),
  );
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
});
afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it.each([false, true])(
  "waits for actual reflow completion and respects user scroll cancellation (%s)",
  async (cancelled) => {
    const body = document.createElement("div");
    body.className = "media-workspace-body";
    const scroller = document.createElement("div");
    const item = document.createElement("button");
    item.className = "media-gallery-item";
    item.dataset.mediaKey = "one";
    scroller.appendChild(item);
    body.appendChild(scroller);
    document.body.appendChild(body);
    Object.defineProperty(scroller, "getBoundingClientRect", {
      value: () => ({ top: 0, bottom: 300 }),
    });
    // The visual transform still shows the old position; layout has already moved.
    Object.defineProperty(item, "getBoundingClientRect", {
      value: () => ({ top: 100, bottom: 150 }),
    });
    Object.defineProperty(item, "offsetTop", { value: 600 });
    Object.defineProperty(item, "offsetParent", { value: scroller });
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const stopReflow = vi.fn();
    Object.defineProperty(body, "getAnimations", {
      value: () => [{ finished }],
    });
    Object.defineProperty(item, "getAnimations", {
      value: () => [{ cancel: stopReflow }],
    });
    const ref = { current: scroller };
    const { result, rerender } = renderHook(
      ({ layout }) => useMediaScroll(ref, layout, "all"),
      { initialProps: { layout: "grid:closed" } },
    );
    act(() => result.current("one"));
    rerender({ layout: "grid:open" });
    act(() => vi.advanceTimersByTime(1000));
    expect(scroller.scrollTop).toBe(0);
    if (cancelled) scroller.dispatchEvent(new Event("wheel"));
    await act(async () => {
      finish();
      await finished;
    });
    act(() => vi.advanceTimersByTime(40));
    expect(scroller.scrollTop).toBe(cancelled ? 0 : 500);
    expect(stopReflow).toHaveBeenCalledTimes(cancelled ? 0 : 1);
  },
);
