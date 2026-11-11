// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PAGE_FADE_MS } from "@/components/layout/page-fade";
import { useReadingColumn } from "./use-reading-column";

const reducedMotion = { matches: false };

let goTo: (post: boolean) => void;
let setLeaving: (leaving: boolean) => void;

/**
 * A shell's column as the hook sees it: `main` around the page in its
 * transition, which drops the class it fades out under when the next page
 * comes in (as `PageFade` does).
 */
function Column({ initial }: { initial: boolean }) {
  const [post, setPost] = useState(initial);
  const [leaving, setLeavingState] = useState(false);
  goTo = (next) => {
    act(() => {
      setPost(next);
    });
  };
  setLeaving = setLeavingState;
  const mainRef = useRef<HTMLElement>(null);
  const reading = useReadingColumn(post, mainRef);
  return createElement(
    "div",
    { "data-testid": "shell", "data-column": reading ? "reading" : undefined },
    createElement(
      "main",
      { ref: mainRef },
      createElement(
        "div",
        { className: leaving ? "page-fade is-leaving" : "page-fade" },
        "Page content",
      ),
    ),
  );
}

function renderColumn(post: boolean) {
  render(createElement(Column, { initial: post }));
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
}

function column() {
  return screen.getByTestId("shell").dataset.column;
}

function after(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** By when the page that is left is at a few hundredths of its opacity. */
const ALL_BUT_GONE_MS = PAGE_FADE_MS - 20;

beforeEach(() => {
  reducedMotion.matches = false;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("prefers-reduced-motion") && reducedMotion.matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.unstubAllGlobals();
});

describe("the reading column", () => {
  it.each([
    [true, "reading"],
    [false, undefined],
  ] as const)(
    "is the page's own on the page a reader lands on (a Post: %s)",
    (post, expected) => {
      renderColumn(post);

      expect(column()).toBe(expected);
    },
  );

  // The page that is left stays on screen while it fades out (PageFade),
  // after the address has changed. The column changes with the page: a
  // moment before the next one shows, when the last has all but gone.
  describe("going from one page to another", () => {
    it("keeps the wide column while the page that is left fades out, and has the reading column when the Post shows", () => {
      renderColumn(false);

      goTo(true);
      expect(column()).toBeUndefined();
      after(ALL_BUT_GONE_MS);
      expect(column()).toBeUndefined();

      after(PAGE_FADE_MS - ALL_BUT_GONE_MS);
      expect(column()).toBe("reading");
    });

    it("keeps the reading column while the Post that is left fades out, and has the wide one when the next page shows", () => {
      renderColumn(true);

      goTo(false);
      after(ALL_BUT_GONE_MS);
      expect(column()).toBe("reading");

      after(PAGE_FADE_MS - ALL_BUT_GONE_MS);
      expect(column()).toBeUndefined();
    });

    // The transition around the page drops the class the page fades out
    // under in the commit that swaps the pages; a timer could be a frame
    // off either way.
    it("changes the column in the commit that lets the next page in, without waiting for its own timer", async () => {
      renderColumn(false);

      goTo(true);
      await act(async () => setLeaving(true));
      expect(column()).toBeUndefined();

      after(PAGE_FADE_MS / 2);
      await act(async () => setLeaving(false));
      expect(column()).toBe("reading");
    });

    it("leaves the column alone on the way back to a page left a moment ago", () => {
      renderColumn(true);

      goTo(false);
      after(PAGE_FADE_MS / 2);
      goTo(true);
      after(PAGE_FADE_MS / 2);
      expect(column()).toBe("reading");

      after(PAGE_FADE_MS);
      expect(column()).toBe("reading");
    });

    it("has the next page's column at once for a reader who asked for less motion", () => {
      reducedMotion.matches = true;
      renderColumn(false);

      goTo(true);
      expect(column()).toBe("reading");

      goTo(false);
      expect(column()).toBeUndefined();
    });
  });
});
