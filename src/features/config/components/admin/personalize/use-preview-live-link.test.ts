// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  THEME_PREVIEW_READY,
  THEME_PREVIEW_UPDATE,
} from "@/features/theme/utils/theme-preview-messages";
import {
  usePreviewLiveLink,
  type PreviewLiveValues,
} from "./use-preview-live-link";

const frame = { postMessage: vi.fn() };
const origin = window.location.origin;

let frames: Array<() => void> = [];
beforeEach(() => {
  frame.postMessage.mockReset();
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const nextFrame = () =>
  act(() => {
    const due = frames;
    frames = [];
    for (const callback of due) callback();
  });

const live = (bannerFocus = { x: 50, y: 50 }, primaryHue = 250) => ({
  bannerFocus,
  primaryHue,
});

function render(initial: PreviewLiveValues = live()) {
  return renderHook(
    (values: PreviewLiveValues) => usePreviewLiveLink(() => frame, values),
    { initialProps: initial },
  );
}

/** The preview telling its parent it has loaded. */
function ready(source: unknown = frame) {
  const event = new Event("message");
  Object.defineProperties(event, {
    data: { value: { type: THEME_PREVIEW_READY } },
    origin: { value: origin },
    source: { value: source },
  });
  act(() => {
    window.dispatchEvent(event);
  });
}

it("posts the focus and the hue to the preview when they change, not a new address", () => {
  const { rerender } = render();
  nextFrame();
  frame.postMessage.mockClear();

  rerender(live({ x: 20, y: 70 }, 250));
  nextFrame();
  expect(frame.postMessage).toHaveBeenCalledTimes(1);
  expect(frame.postMessage).toHaveBeenCalledWith(
    {
      type: THEME_PREVIEW_UPDATE,
      fields: { bannerFocus: { x: 20, y: 70 }, primaryHue: 250 },
    },
    origin,
  );

  rerender(live({ x: 20, y: 70 }, 120));
  nextFrame();
  expect(frame.postMessage).toHaveBeenLastCalledWith(
    expect.objectContaining({
      fields: { bannerFocus: { x: 20, y: 70 }, primaryHue: 120 },
    }),
    origin,
  );
});

it("posts once per animation frame while a control is dragged, the latest value", () => {
  const { rerender } = render();
  nextFrame();
  frame.postMessage.mockClear();

  for (const hue of [10, 11, 12, 13]) rerender(live({ x: 50, y: 50 }, hue));
  expect(frame.postMessage).not.toHaveBeenCalled();
  nextFrame();
  expect(frame.postMessage).toHaveBeenCalledTimes(1);
  expect(frame.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      fields: { bannerFocus: { x: 50, y: 50 }, primaryHue: 13 },
    }),
    origin,
  );
});

it("sends the focus and the hue again each time the preview says it is ready", () => {
  const { rerender } = render();
  nextFrame();
  rerender(live({ x: 5, y: 95 }, 330));
  nextFrame();
  frame.postMessage.mockClear();

  ready();
  expect(frame.postMessage).toHaveBeenCalledWith(
    {
      type: THEME_PREVIEW_UPDATE,
      fields: { bannerFocus: { x: 5, y: 95 }, primaryHue: 330 },
    },
    origin,
  );
  ready();
  expect(frame.postMessage).toHaveBeenCalledTimes(2);
});

it("ignores a ready message from any other window", () => {
  render();
  nextFrame();
  frame.postMessage.mockClear();
  ready({ postMessage: vi.fn() });
  expect(frame.postMessage).not.toHaveBeenCalled();
});

it("sends nothing while the frame has no window yet", () => {
  const { rerender } = renderHook(
    (values: PreviewLiveValues) => usePreviewLiveLink(() => null, values),
    { initialProps: live() },
  );
  rerender(live({ x: 1, y: 1 }, 1));
  nextFrame();
  expect(frame.postMessage).not.toHaveBeenCalled();
});
