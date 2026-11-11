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
} from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingActionsProvider } from "@/components/layout/floating-actions";
import { FirstScreenProvider } from "@/features/theme/components/first-screen";
import TableOfContents from "./table-of-contents";

const HEADERS = [
  { id: "one", text: "One", level: 2 },
  { id: "two", text: "Two", level: 2 },
];
/** The side list in the window: 14rem wide, 5rem down, 580px tall. */
const LIST = { left: 1100, right: 1324, top: 80, height: 580 };

/** A page with this content, inside what a shell and the host provide. */
async function mount(...content: Array<ReactNode>) {
  const root = createRootRoute({
    component: () =>
      createElement(FirstScreenProvider, {
        height: () => 0,
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
