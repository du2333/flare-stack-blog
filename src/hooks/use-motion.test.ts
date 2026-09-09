// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useContentMotion, useMotionPresence } from "./use-motion";

let reduced = false;
let listeners: Set<() => void>;
beforeEach(() => {
  reduced = false;
  listeners = new Set();
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, callback: () => void) =>
      listeners.add(callback),
    removeEventListener: (_: string, callback: () => void) =>
      listeners.delete(callback),
  }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("retains exits, reverses a rapid reopen and removes only the final closed surface", () => {
  const { result, rerender } = renderHook(
    ({ open }) => useMotionPresence(open, 320),
    { initialProps: { open: false } },
  );
  expect(result.current).toBe(false);
  rerender({ open: true });
  expect(result.current).toBe(true);
  rerender({ open: false });
  act(() => vi.advanceTimersByTime(160));
  expect(result.current).toBe(true);
  rerender({ open: true });
  act(() => vi.advanceTimersByTime(320));
  expect(result.current).toBe(true);
  rerender({ open: false });
  act(() => vi.advanceTimersByTime(320));
  expect(result.current).toBe(false);
});
it("honors a live reduced-motion change during exit", () => {
  const { result, rerender } = renderHook(
    ({ open }) => useMotionPresence(open, 320),
    { initialProps: { open: true } },
  );
  rerender({ open: false });
  expect(result.current).toBe(true);
  act(() => {
    reduced = true;
    listeners.forEach((callback) => callback());
  });
  expect(result.current).toBe(false);
});
it("animates explicit content changes only, cancels interrupted transitions and leaves repeated updates alone", () => {
  const cancel = vi.fn();
  const animate = vi.fn(() => ({ cancel }));
  const element = document.createElement("div");
  Object.defineProperty(element, "animate", { value: animate });
  const ref = { current: element };
  const { rerender, unmount } = renderHook(
    ({ key }) => useContentMotion(ref, key),
    { initialProps: { key: "a" } },
  );
  expect(animate).not.toHaveBeenCalled();
  rerender({ key: "b" });
  expect(animate).toHaveBeenCalledTimes(1);
  rerender({ key: "b" });
  expect(animate).toHaveBeenCalledTimes(1);
  rerender({ key: "c" });
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(animate).toHaveBeenCalledTimes(2);
  unmount();
  expect(cancel).toHaveBeenCalledTimes(2);
});
