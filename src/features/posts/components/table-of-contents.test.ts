// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FloatingActionsProvider,
  useFloatingActionsSlotRef,
} from "@/components/layout/floating-actions";
import { FirstScreenProvider } from "@/features/theme/components/first-screen";
import { TocSlot, TocSlotProvider } from "@/features/theme/components/toc-slot";
import { m } from "@/paraglide/messages";
import TableOfContents from "./table-of-contents";

const HEADERS = [
  { id: "one", text: "One", level: 2 },
  { id: "two", text: "Two", level: 2 },
];
/** The side list in the window: 14rem wide, 5rem down, 580px tall. */
const LIST = { left: 1100, right: 1324, top: 80, height: 580 };

/** Where the shell's first screen ends; a test's own to change. */
let firstScreen = 0;

/** A page with this content, inside what a shell and the host provide. */
async function mount(...content: Array<ReactNode>) {
  const root = createRootRoute({
    component: () =>
      createElement(FirstScreenProvider, {
        height: () => firstScreen,
        children: createElement(FloatingActionsProvider, null, ...content),
      }),
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await act(async () => {
    render(createElement(RouterProvider, { router }));
  });
}

/** The page with its footer region where `footer` says, laid out by hand. */
async function renderPage(footer: {
  left: number;
  right: number;
  top: number;
}) {
  await mount(
    createElement(TableOfContents, { headers: HEADERS }),
    createElement("div", { "data-shell-region": "footer" }),
  );
  const list = document.querySelector<HTMLElement>("body > nav")!;
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
    {},
  ] as unknown as DOMRectList);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      const given =
        Number.parseFloat(list.style.getPropertyValue("--toc-yield")) || 0;
      return list.contains(this) ? LIST.height - given : 0;
    },
  );
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      if (this === list) return LIST as unknown as DOMRect;
      if (this.dataset.shellRegion === "footer") return footer as DOMRect;
      return { left: 0, right: 0, top: 0, bottom: 0 } as DOMRect;
    },
  );
  return {
    list,
    footer,
    scroll: () =>
      act(() => {
        fireEvent.scroll(window);
      }),
  };
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  firstScreen = 0;
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the side table of contents at the end of a page", () => {
  it("keeps its height while the footer is below it", async () => {
    const { list, scroll } = await renderPage({
      left: 0,
      right: 1440,
      top: 900,
    });

    scroll();

    expect(list.style.getPropertyValue("--toc-yield")).toBe("");
  });

  it("ends 1rem short of a footer that runs under it, and has its height back when the footer is gone", async () => {
    const { list, footer, scroll } = await renderPage({
      left: 0,
      right: 1440,
      top: 600,
    });

    scroll();
    // The list would reach 660px down; the footer starts at 600px.
    expect(list.style.getPropertyValue("--toc-yield")).toBe("76px");
    expect(list.firstElementChild!.className).toContain(
      "h-[max(0px,calc(100vh-20rem-var(--toc-yield,0px)))]",
    );

    footer.top = 560;
    scroll();
    expect(list.style.getPropertyValue("--toc-yield")).toBe("116px");

    footer.top = 900;
    scroll();
    expect(list.style.getPropertyValue("--toc-yield")).toBe("0px");
  });

  // 「经典」 and 「名片」: the footer keeps to the column, the list is beside it.
  it("leaves alone a footer that does not run under it", async () => {
    const { list, scroll } = await renderPage({
      left: 120,
      right: 1084,
      top: 300,
    });

    scroll();

    expect(list.style.getPropertyValue("--toc-yield")).toBe("");
  });
});

describe("the side table of contents beside its column", () => {
  /** Each ResizeObserver the page made, and what it watches. */
  let observers: Array<{
    callback: ResizeObserverCallback;
    targets: Array<Element>;
  }>;
  /** Where the column puts the start of the side list, in the window. */
  let anchorLeft: number;

  beforeEach(() => {
    observers = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        entry: (typeof observers)[number];
        constructor(callback: ResizeObserverCallback) {
          this.entry = { callback, targets: [] };
          observers.push(this.entry);
        }
        observe(target: Element) {
          this.entry.targets.push(target);
        }
        unobserve() {}
        disconnect() {
          this.entry.targets = [];
        }
      },
    );
    anchorLeft = 1100;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const left =
          this.parentElement?.dataset.testid === "column" ? anchorLeft : 0;
        return { left, right: left, top: 0, bottom: 0 } as DOMRect;
      },
    );
  });

  async function renderColumn() {
    await mount(
      createElement(
        "div",
        { "data-testid": "column" },
        createElement(TableOfContents, { headers: HEADERS }),
      ),
    );
    return document.querySelector<HTMLElement>("body > nav")!;
  }

  function watching(element: Element) {
    return observers.filter(({ targets }) => targets.includes(element));
  }

  it("stands again where its column puts it when the column changes width, though the window does not", async () => {
    const list = await renderColumn();
    expect(list.style.left).toBe("1100px");

    // A rail comes in beside the column, or the shell switches to a reading
    // column: the column narrows, and the window stays as it was.
    anchorLeft = 900;
    const [observer] = watching(screen.getByTestId("column"));
    act(() => {
      observer!.callback([], {} as ResizeObserver);
    });

    expect(list.style.left).toBe("900px");
  });

  it("stands again where its column puts it when the window is resized", async () => {
    const list = await renderColumn();

    anchorLeft = 1250;
    act(() => {
      fireEvent(window, new Event("resize"));
    });

    expect(list.style.left).toBe("1250px");
  });

  it("stops watching the column when the page goes", async () => {
    await renderColumn();
    const column = screen.getByTestId("column");
    expect(watching(column)).toHaveLength(1);

    cleanup();

    expect(watching(column)).toHaveLength(0);
  });
});

describe("the side table of contents in the shell's slot", () => {
  /** The shell's floating column, which the button of the compact form joins. */
  function FloatingColumn() {
    return createElement("div", {
      "data-testid": "floating",
      ref: useFloatingActionsSlotRef(),
    });
  }

  /**
   * A Post's page (its column, with the prose the list waits for) in a shell
   * that gives the list a slot, or not.
   */
  async function renderPost({
    slot = true,
    headers = HEADERS,
  }: { slot?: boolean; headers?: typeof HEADERS } = {}) {
    await mount(
      createElement(
        TocSlotProvider,
        null,
        slot ? createElement(TocSlot, { className: "rail-toc" }) : null,
        createElement(FloatingColumn),
        createElement(
          "div",
          { "data-testid": "column" },
          createElement(TableOfContents, { headers }),
          createElement("div", { className: "fuwari-custom-md" }),
        ),
        createElement("div", { "data-shell-region": "footer" }),
      ),
    );
    return {
      slot: document.querySelector<HTMLElement>("[data-toc-slot]"),
      /** The prose has come in: the list is ready to show. */
      ready: () =>
        act(() => {
          fireEvent.animationEnd(document.querySelector(".fuwari-custom-md")!);
        }),
    };
  }

  /** The side list, wherever it stands. */
  function sideList() {
    return document.querySelector('a[href="#one"]')!.closest("nav")!;
  }

  it("renders the side list into the slot, not fixed to the window", async () => {
    const { slot } = await renderPost();

    expect(slot!.className).toBe("rail-toc");
    expect(slot!.children).toHaveLength(1);
    expect(slot!.firstElementChild).toBe(sideList());
    expect(document.querySelector("body > nav")).toBeNull();
    // Where the shell says (--shell-toc-top, -left, -width) is not read.
    expect(sideList().className).not.toContain("fixed");
    expect(sideList().className).not.toContain("--shell-toc-top");
    expect(sideList().style.left).toBe("");
    expect(sideList().style.width).toBe("");
  });

  it("stands beside the article as before where the shell gives no slot", async () => {
    await renderPost({ slot: false });

    expect(document.querySelector("[data-toc-slot]")).toBeNull();
    expect(sideList().parentElement).toBe(document.body);
    expect(sideList().className).toContain("fixed top-(--shell-toc-top)");
  });

  it("fills the slot's box and scrolls within it when the list is the longer", async () => {
    await renderPost();
    const scroller = sideList().firstElementChild!;

    expect(sideList().className).toContain("h-full");
    expect(scroller.className).toContain("h-full");
    expect(scroller.className).toContain("overflow-y-scroll");
    expect(scroller.className).not.toContain("100vh");
  });

  it("shows from the top of the page once ready, where the list beside the article waits for the first screen to pass", async () => {
    firstScreen = 300;
    const { ready } = await renderPost();
    expect(sideList().className).toContain("opacity-0");

    ready();
    expect(sideList().className).toContain("opacity-100");
    cleanup();

    const beside = await renderPost({ slot: false });
    beside.ready();
    expect(sideList().className).toContain("opacity-0");

    Object.defineProperty(window, "scrollY", {
      value: 300,
      configurable: true,
    });
    act(() => {
      fireEvent.scroll(window);
    });
    expect(sideList().className).toContain("opacity-100");
  });

  // A shell whose Post page has no first screen says 0 (first-screen.tsx).
  it("shows the list beside the article from the top of a page that has no first screen, once ready", async () => {
    const { ready } = await renderPost({ slot: false });
    expect(sideList().className).toContain("opacity-0");

    ready();

    expect(sideList().className).toContain("opacity-100");
    expect(sideList().className).not.toContain("pointer-events-none");
  });

  it("keeps to the slot at the end of the page, whatever runs under it", async () => {
    await renderPost();
    const list = sideList();
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
      {},
    ] as unknown as DOMRectList);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this === list) return LIST as unknown as DOMRect;
        return { left: 0, right: 1440, top: 300, bottom: 900 } as DOMRect;
      },
    );

    act(() => {
      fireEvent.scroll(window);
    });

    expect(list.style.getPropertyValue("--toc-yield")).toBe("");
  });

  it("leaves the compact form as it is: the button in the floating column", async () => {
    await renderPost({ slot: false });
    const beside = screen.getByTestId("floating").innerHTML;
    cleanup();

    await renderPost();
    const floating = screen.getByTestId("floating");

    expect(floating.innerHTML).toBe(beside);
    expect(
      within(floating).getByRole("button", { name: m.post_toc() }),
    ).toBeTruthy();
  });

  it("leaves the slot empty on a Post without headings, and the page unmarked", async () => {
    const { slot } = await renderPost({ headers: [] });

    expect(slot!.childNodes).toHaveLength(0);
    expect(document.querySelector("[data-table-of-contents]")).toBeNull();
    expect(screen.getByTestId("floating").childNodes).toHaveLength(0);
  });

  it("marks the page while it has entries, in the article column and not in the slot", async () => {
    const { slot } = await renderPost();
    const marks = document.querySelectorAll("[data-table-of-contents]");

    expect(marks).toHaveLength(1);
    expect(screen.getByTestId("column").contains(marks[0]!)).toBe(true);
    expect(slot!.contains(marks[0]!)).toBe(false);
  });

  // So a shell's stylesheet can show something else in the slot's place
  // before the list has come in, and not change it once it has.
  it("marks the page from the first paint, before anything is measured", async () => {
    const root = createRootRoute({
      component: () =>
        createElement(FirstScreenProvider, {
          height: () => 0,
          children: createElement(
            FloatingActionsProvider,
            null,
            createElement(
              TocSlotProvider,
              null,
              createElement(TocSlot),
              createElement(TableOfContents, { headers: HEADERS }),
            ),
          ),
        }),
    });
    const router = createRouter({
      routeTree: root,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    await router.load();

    const html = renderToString(createElement(RouterProvider, { router }));

    expect(html).toContain("data-table-of-contents");
    expect(html).not.toContain('href="#one"');
  });
});
