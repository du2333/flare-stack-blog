// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PageKind } from "../../theme-shell";
import { usePageOnScreen } from "./use-page-on-screen";

/** The address names a page of this kind; `main` still holds the last one. */
let goTo: (pageKind: PageKind) => void;
/** The page the address names is rendered in `main`. */
let arrive: () => Promise<void>;
/** The page on screen changes something of its own, well inside itself. */
let stir: () => Promise<void>;

/**
 * A shell's column as the hook sees it: `main` around the page in its
 * transition, as `PageFade` has it (the transition, the element it keys by
 * the page, the page).
 */
function Column({ initial }: { initial: PageKind }) {
  const [named, setNamed] = useState(initial);
  const [rendered, setRendered] = useState({ kind: initial, serial: 0 });
  const [stirred, setStirred] = useState(0);
  goTo = (kind) => act(() => setNamed(kind));
  arrive = async () => {
    await act(async () => {
      setRendered(({ serial }) => ({ kind: named, serial: serial + 1 }));
    });
    await act(async () => {});
  };
  stir = async () => {
    await act(async () => {
      setStirred((count) => count + 1);
    });
    await act(async () => {});
  };
  const mainRef = useRef<HTMLElement>(null);
  const { page, swapped } = usePageOnScreen(named, mainRef);
  return createElement(
    "div",
    { "data-testid": "shell", "data-page": page, "data-swapped": swapped },
    createElement(
      "main",
      { ref: mainRef },
      createElement(
        "div",
        { className: "fuwari-page-fade" },
        createElement(
          "div",
          null,
          createElement(
            "article",
            { key: rendered.serial },
            `A page of kind ${rendered.kind}`,
            createElement("p", { key: stirred }, "Something of its own"),
          ),
        ),
      ),
    ),
  );
}

async function renderColumn(initial: PageKind) {
  const root = createRootRoute({
    component: () => createElement(Column, { initial }),
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await act(async () => {
    render(createElement(RouterProvider, { router }));
  });
  await screen.findByText("Something of its own");
}

function page() {
  return screen.getByTestId("shell").dataset.page;
}
function swapped() {
  return screen.getByTestId("shell").dataset.swapped;
}

/** The frames asked for and not yet run; none runs unless a test says so. */
const frames = new Map<number, FrameRequestCallback>();
function nextFrame() {
  act(() => {
    const due = [...frames.values()];
    frames.clear();
    for (const frame of due) frame(0);
  });
}

beforeEach(() => {
  let handle = 0;
  frames.clear();
  vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => {
    frames.set(++handle, frame);
    return handle;
  });
  vi.stubGlobal("cancelAnimationFrame", (cancelled: number) =>
    frames.delete(cancelled),
  );
  vi.stubGlobal("scrollTo", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the page on screen", () => {
  it.each(["home", "inner", "post", "focused"] as const)(
    "is the %s page the shell mounts on",
    async (kind) => {
      await renderColumn(kind);

      expect(page()).toBe(kind);
    },
  );

  it("is still the page that is left when the address names the next one", async () => {
    await renderColumn("inner");

    goTo("post");

    expect(page()).toBe("inner");
  });

  // No timer and no frame: the shell is rendered again before the page that
  // came in is painted.
  it("is the next page from the moment `main` holds it", async () => {
    await renderColumn("inner");
    goTo("post");

    await arrive();

    expect(page()).toBe("post");
    goTo("home");
    expect(page()).toBe("post");
    await arrive();
    expect(page()).toBe("home");
  });

  it("does not take what a page changes within itself for a page that came in", async () => {
    await renderColumn("post");
    goTo("inner");

    await stir();

    expect(page()).toBe("post");
    await arrive();
    expect(page()).toBe("inner");
  });

  // An address may change the kind without another page: then nothing in
  // `main` is replaced, and the router has nothing left to load.
  it("takes the address at its word two frames after the router has settled, where no page was replaced", async () => {
    await renderColumn("inner");
    frames.clear();

    goTo("focused");
    expect(page()).toBe("inner");
    nextFrame();
    expect(page()).toBe("inner");
    nextFrame();
    expect(page()).toBe("focused");
  });

  it("asks for no frame once the page that came in has been seen", async () => {
    await renderColumn("inner");
    goTo("post");
    await arrive();

    expect(frames.size).toBe(0);
  });
});

describe("a swap with a Post's page", () => {
  it("is none among the other pages", async () => {
    await renderColumn("home");
    expect(swapped()).toBe("false");

    goTo("inner");
    await arrive();
    expect(swapped()).toBe("false");
    goTo("focused");
    await arrive();
    expect(swapped()).toBe("false");
  });

  it("is on the way into a Post's page and on the way out of it, in the commit that changes the page", async () => {
    await renderColumn("inner");

    goTo("post");
    expect(swapped()).toBe("false");
    await arrive();
    expect(swapped()).toBe("true");

    goTo("home");
    expect(swapped()).toBe("true");
    await arrive();
    expect(page()).toBe("home");
    expect(swapped()).toBe("true");

    goTo("inner");
    await arrive();
    expect(swapped()).toBe("false");
  });

  it("is so on a Post's page the shell mounts on", async () => {
    await renderColumn("post");

    expect(swapped()).toBe("true");
  });
});
