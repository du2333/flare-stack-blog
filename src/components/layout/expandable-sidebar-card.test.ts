// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createElement, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Categories } from "@/features/categories/components/category-cloud";
import { categoriesQueryOptions } from "@/features/categories/queries";
import { Tags } from "@/features/tags/components/tag-cloud";
import { tagsQueryOptions } from "@/features/tags/queries";
import { m } from "@/paraglide/messages";
import { ExpandableSidebarCard } from "./expandable-sidebar-card";

vi.mock("@/features/categories/queries", () => ({
  categoriesQueryOptions: {
    queryKey: ["sidebar-categories"],
    staleTime: Infinity,
  },
}));
vi.mock("@/features/tags/queries", () => ({
  tagsQueryOptions: {
    queryKey: ["sidebar-tags"],
    staleTime: Infinity,
  },
}));

let queryClient: QueryClient | undefined;

afterEach(() => {
  cleanup();
  queryClient?.clear();
  queryClient = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function more() {
  return screen.queryByRole("button", { name: m.widget_more() });
}

/**
 * Whether the narrow form offers 「更多」. The wide form always has it in the
 * markup and shows it by what is cut off, so a card with few entries keeps
 * it out of the narrow form with a class, which jsdom does not apply.
 */
function offeredWhenNarrow() {
  const button = more();
  return button !== null && !button.parentElement!.classList.contains("hidden");
}

describe("the narrow form", () => {
  it.each([
    {
      name: "Categories",
      Component: Categories,
      queryKey: categoriesQueryOptions.queryKey,
      threshold: 5,
      filter: "categoryName",
    },
    {
      name: "Tags",
      Component: Tags,
      queryKey: tagsQueryOptions.queryKey,
      threshold: 20,
      filter: "tagName",
    },
  ])(
    "preserves $name filters, collapse threshold, and expansion across empty results",
    async ({ Component, queryKey, threshold, filter }) => {
      queryClient = new QueryClient();
      queryClient.setQueryData<unknown>(queryKey, []);
      const root = createRootRoute();
      const index = createRoute({
        getParentRoute: () => root,
        path: "/",
        component: Component,
      });
      const posts = createRoute({ getParentRoute: () => root, path: "/posts" });
      const router = createRouter({
        routeTree: root.addChildren([index, posts]),
        history: createMemoryHistory({ initialEntries: ["/"] }),
      });
      let view!: ReturnType<typeof render>;
      await act(async () => {
        view = render(
          createElement(
            QueryClientProvider,
            { client: queryClient! },
            createElement(RouterProvider, { router }),
          ),
        );
        await router.load();
      });
      expect(view.container.childElementCount).toBe(0);

      async function updateItems(count: number) {
        await act(async () => {
          queryClient!.setQueryData<unknown>(
            queryKey,
            Array.from({ length: count }, (_, index) => ({
              id: index + 1,
              name: `Entry ${index + 1}`,
              postCount: index + 3,
              createdAt: new Date(0),
            })),
          );
        });
        await waitFor(() => {
          expect(screen.queryAllByRole("link")).toHaveLength(count);
        });
      }
      /** The entries' box is cut to 7.5rem. */
      const cutShort = () =>
        screen
          .getAllByRole("link")[0]
          .parentElement!.classList.contains("h-30");

      await updateItems(threshold - 1);
      expect(offeredWhenNarrow()).toBe(false);
      const firstLink = screen.getAllByRole("link")[0];
      const target = new URL(
        firstLink.getAttribute("href")!,
        "https://example.com",
      );
      expect(target.pathname).toBe("/posts");
      expect(Array.from(target.searchParams.entries())).toEqual([
        [filter, "Entry 1"],
      ]);
      if (filter === "categoryName") {
        expect(firstLink.textContent).toBe("Entry 13");
      } else {
        expect(firstLink.textContent).toBe("Entry 1");
      }
      expect(cutShort()).toBe(false);

      await updateItems(threshold);
      expect(offeredWhenNarrow()).toBe(true);
      expect(cutShort()).toBe(true);
      fireEvent.click(more()!);
      expect(cutShort()).toBe(false);
      expect(more()).toBeNull();

      await updateItems(0);
      expect(view.container.childElementCount).toBe(0);
      await updateItems(threshold);
      expect(cutShort()).toBe(false);
      expect(more()).toBeNull();
    },
  );
});

/**
 * The layout jsdom does not have: entries stand `perRow` to a row of 40px,
 * and the card shows `rows` of them, through the entries' own box (the
 * narrow form) or through the window around the title and the entries (the
 * wide form).
 */
interface Layout {
  perRow: number;
  rows: number;
  cutBy: "entries" | "window";
}
const ROW_PX = 40;
const FAR_PX = 10_000;
let layout: Layout | null;
/** What each ResizeObserver watches, by its callback. */
let resizeObservers: Map<() => void, Set<Element>>;

function rect(top: number, bottom: number) {
  return { top, bottom, left: 0, right: 0, width: 0, height: bottom - top };
}

beforeEach(() => {
  layout = null;
  resizeObservers = new Map();
});

function useLayout(next: Layout) {
  layout = next;
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(
    () => [{}] as unknown as DOMRectList,
  );
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const { perRow, rows, cutBy } = layout!;
      if (this.tagName === "A") {
        const index = Array.from(this.parentElement!.children).indexOf(this);
        const top = Math.floor(index / perRow) * ROW_PX;
        return rect(top, top + ROW_PX) as DOMRect;
      }
      const isWindow = this.classList.contains("fuwari-widget-window");
      const cuts = isWindow === (cutBy === "window");
      return rect(0, cuts ? rows * ROW_PX : FAR_PX) as DOMRect;
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private readonly callback: () => void) {
        resizeObservers.set(callback, new Set());
      }
      observe(element: Element) {
        resizeObservers.get(this.callback)!.add(element);
      }
      disconnect() {
        resizeObservers.delete(this.callback);
      }
    },
  );
}

/** The layout changes, and the observers of `resized` (the card's window by default) hear of it. */
function resizeTo(next: Partial<Layout>, resized?: Element) {
  layout = { ...layout!, ...next };
  const target = resized ?? document.querySelector(".fuwari-widget-window");
  act(() => {
    for (const [callback, watched] of Array.from(resizeObservers)) {
      if (target && watched.has(target)) callback();
    }
  });
}

function Card({ entries }: { entries: number }) {
  const [expanded, setExpanded] = useState(false);
  return createElement(ExpandableSidebarCard, {
    title: "Index",
    long: false,
    expanded,
    onExpand: () => setExpanded(true),
    children: Array.from({ length: entries }, (_, index) =>
      createElement(
        "a",
        { key: index, href: `/posts?entry=${index + 1}` },
        `Entry ${index + 1}`,
      ),
    ),
  });
}

function card() {
  return screen.getByText("Index").closest<HTMLElement>(".fuwari-card-widget")!;
}

/** The numbers of the entries the keyboard cannot reach. */
function inertEntries() {
  return screen
    .getAllByRole("link")
    .flatMap((link, index) => (link.hasAttribute("inert") ? [index + 1] : []));
}

describe("「更多」 by what is cut off", () => {
  it("is offered and decides nothing before the card is laid out, as on the server", () => {
    render(createElement(Card, { entries: 8 }));

    expect(more()).not.toBeNull();
    expect(card().dataset.cutOff).toBeUndefined();
    expect(inertEntries()).toEqual([]);
  });

  it.each(["entries", "window"] as const)(
    "shows while entries start below what the %s box shows",
    (cutBy) => {
      useLayout({ perRow: 3, rows: 1, cutBy });
      render(createElement(Card, { entries: 8 }));

      expect(card().dataset.cutOff).toBe("true");
      expect(inertEntries()).toEqual([4, 5, 6, 7, 8]);
    },
  );

  it.each(["entries", "window"] as const)(
    "does not show when every entry fits in what the %s box shows",
    (cutBy) => {
      useLayout({ perRow: 3, rows: 2, cutBy });
      render(createElement(Card, { entries: 6 }));

      expect(card().dataset.cutOff).toBe("false");
      expect(inertEntries()).toEqual([]);
    },
  );

  it("follows the card as it is resized, in both directions", () => {
    useLayout({ perRow: 3, rows: 1, cutBy: "window" });
    render(createElement(Card, { entries: 6 }));
    expect(card().dataset.cutOff).toBe("true");

    resizeTo({ perRow: 6 });
    expect(card().dataset.cutOff).toBe("false");
    expect(inertEntries()).toEqual([]);

    resizeTo({ perRow: 4 });
    expect(card().dataset.cutOff).toBe("true");
    expect(inertEntries()).toEqual([5, 6]);

    // The form changes: two rows under the title instead of one after it.
    resizeTo({ perRow: 2, rows: 2 });
    expect(card().dataset.cutOff).toBe("true");
    expect(inertEntries()).toEqual([5, 6]);
  });

  // A web font arriving, or an entry easing from one form into the other,
  // resizes entries and neither box around them.
  it("measures again when an entry changes size", () => {
    useLayout({ perRow: 6, rows: 1, cutBy: "entries" });
    render(createElement(Card, { entries: 6 }));
    expect(card().dataset.cutOff).toBe("false");

    resizeTo({ perRow: 5 }, screen.getAllByRole("link")[2]);

    expect(card().dataset.cutOff).toBe("true");
    expect(inertEntries()).toEqual([6]);
  });

  it("measures again when the entries change", () => {
    useLayout({ perRow: 3, rows: 1, cutBy: "window" });
    const view = render(createElement(Card, { entries: 3 }));
    expect(card().dataset.cutOff).toBe("false");

    view.rerender(createElement(Card, { entries: 4 }));

    expect(card().dataset.cutOff).toBe("true");
    expect(inertEntries()).toEqual([4]);
    // The new entry is watched like the others.
    resizeTo({ perRow: 2 }, screen.getAllByRole("link")[3]);
    expect(inertEntries()).toEqual([3, 4]);
  });

  it("shows everything once used, and takes the keyboard on to the first entry it revealed", () => {
    useLayout({ perRow: 3, rows: 1, cutBy: "window" });
    render(createElement(Card, { entries: 8 }));
    const button = more()!;
    button.focus();

    fireEvent.click(button);

    expect(more()).toBeNull();
    expect(inertEntries()).toEqual([]);
    expect(document.activeElement).toBe(screen.getAllByRole("link")[3]);
    // Nothing is cut off any more, so nothing is watched.
    expect(resizeObservers.size).toBe(0);
  });

  it("leaves the focus where it is when 「更多」 was used with the pointer", () => {
    useLayout({ perRow: 3, rows: 1, cutBy: "window" });
    render(createElement(Card, { entries: 8 }));

    fireEvent.click(more()!);

    expect(document.activeElement).toBe(document.body);
  });
});
