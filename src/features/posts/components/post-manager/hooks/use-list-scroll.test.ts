// @vitest-environment jsdom
import { act, cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  readPostListPosition,
  savePostListPosition,
  type PostListLocation,
} from "../list-position";
import { useListScroll } from "./use-list-scroll";

const location: PostListLocation = {
  page: 2,
  status: "ALL",
  sortBy: "updatedAt",
  search: "",
};
let element: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  element = document.createElement("div");
  document.body.appendChild(element);
});
afterEach(() => {
  cleanup();
  element.remove();
  sessionStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("waits for rows before restoring and saves a scroll immediately on editor departure", () => {
  savePostListPosition(JSON.stringify(location), { top: 280, left: 0 });
  const ref = { current: element };
  const { rerender, unmount } = renderHook(
    ({ ready }) => useListScroll(ref, location, ready),
    { initialProps: { ready: false } },
  );
  expect(element.scrollTop).toBe(0);
  rerender({ ready: true });
  expect(element.scrollTop).toBe(280);
  element.scrollTop = 310;
  fireEvent.scroll(element);
  unmount();
  expect(readPostListPosition(JSON.stringify(location))).toEqual({
    top: 310,
    left: 0,
  });
});
it("resets a newly selected page instead of reviving its older cached offset", () => {
  const next = { ...location, page: 3 };
  savePostListPosition(JSON.stringify(next), { top: 250, left: 0 });
  const ref = { current: element };
  const { rerender } = renderHook(
    ({ value, ready }) => useListScroll(ref, value, ready),
    { initialProps: { value: location, ready: true } },
  );
  element.scrollTop = 200;
  fireEvent.scroll(element);
  rerender({ value: next, ready: false });
  expect(element.scrollTop).toBe(200);
  rerender({ value: next, ready: true });
  expect(element.scrollTop).toBe(0);
  act(() => vi.advanceTimersByTime(150));
  expect(readPostListPosition(JSON.stringify(location))).toEqual({
    top: 200,
    left: 0,
  });
  expect(readPostListPosition(JSON.stringify(next))).toEqual({
    top: 0,
    left: 0,
  });
});
