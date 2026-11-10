// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createElement } from "react";
import { findInPopover } from "tests/popover";
import { afterEach, expect, it, vi } from "vitest";
import { m } from "@/paraglide/messages";
import { WIDE_TOOLBAR_QUERY } from "../types";
import { PostsToolbar } from "./posts-toolbar";

vi.mock("@/hooks/use-motion", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-motion")>()),
  useMotionPresence: (open: boolean) => open,
}));
vi.mock("@/lib/orpc", async () => {
  const { createTanstackQueryUtils } = await import("@orpc/tanstack-query");
  return {
    orpc: createTanstackQueryUtils({
      categories: {
        list: async () => [],
        admin: { options: async () => [{ id: 2, name: "Notes" }] },
      },
      tags: {
        list: async () => [],
        admin: { list: async () => [{ id: 5, name: "Rust" }] },
      },
    }),
  };
});

afterEach(cleanup);

/** jsdom has no layout: say whether the viewport is at least 1024px wide. */
function setViewport(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query === WIDE_TOOLBAR_QUERY && wide,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

function renderToolbar(
  filters: { category?: number | "none"; tag?: number },
  { wide = true } = {},
) {
  setViewport(wide);
  const onCategoryChange = vi.fn();
  const onTagChange = vi.fn();
  const onSortByChange = vi.fn();
  const onClearTaxonomy = vi.fn();
  const onManageTaxonomy = vi.fn();
  render(
    createElement(
      QueryClientProvider,
      {
        client: new QueryClient({
          defaultOptions: { queries: { retry: false } },
        }),
      },
      createElement(PostsToolbar, {
        searchTerm: "",
        onSearchChange: vi.fn(),
        searchRef: null,
        status: "ALL",
        onStatusChange: vi.fn(),
        sortBy: "updatedAt",
        onSortByChange,
        onCategoryChange,
        onTagChange,
        onClearTaxonomy,
        onManageTaxonomy,
        ...filters,
      }),
    ),
  );
  return {
    onCategoryChange,
    onTagChange,
    onSortByChange,
    onClearTaxonomy,
    onManageTaxonomy,
  };
}

const filterButton = () =>
  screen.getByRole("button", {
    name: new RegExp(`^${m.admin_posts_filter_button()}`),
  });

async function pick(menu: string, option: string) {
  fireEvent.click(screen.getByRole("button", { name: menu }));
  fireEvent.click(await findInPopover("menuitemradio", { name: option }));
}

async function openFilters() {
  fireEvent.click(filterButton());
  await findInPopover("dialog", { name: m.admin_posts_filter_button() });
}

it("offers the unpublished changes filter with its count between published and draft", () => {
  setViewport(true);
  const onStatusChange = vi.fn();
  render(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(PostsToolbar, {
        searchTerm: "",
        onSearchChange: vi.fn(),
        searchRef: null,
        status: "ALL",
        statusCounts: { draft: 3, published: 5, unpublishedChanges: 2 },
        onStatusChange,
        sortBy: "updatedAt",
        onSortByChange: vi.fn(),
        onCategoryChange: vi.fn(),
        onTagChange: vi.fn(),
      }),
    ),
  );

  const tabs = screen.getAllByRole("tab");
  expect(tabs.map((tab) => tab.getAttribute("data-value"))).toEqual([
    "ALL",
    "PUBLISHED",
    "CHANGED",
    "DRAFT",
  ]);
  const changed = tabs[2]!;
  expect(changed.textContent).toBe(`${m.admin_posts_filter_changed()} 2`);
  expect(tabs[1]!.textContent).toBe(`${m.admin_posts_filter_published()} 5`);
  fireEvent.click(changed);
  expect(onStatusChange).toHaveBeenCalledWith("CHANGED");
});

it("filters by a category, by uncategorized posts and by a tag from the filter panel", async () => {
  const { onCategoryChange, onTagChange } = renderToolbar({});
  await openFilters();
  await screen.findByText(m.admin_posts_filter_category_all());

  await pick(m.admin_posts_filter_category(), "Notes");
  expect(onCategoryChange).toHaveBeenLastCalledWith(2);
  await pick(m.admin_posts_filter_category(), m.post_uncategorized());
  expect(onCategoryChange).toHaveBeenLastCalledWith("none");
  await pick(m.admin_posts_filter_tag(), "Rust");
  expect(onTagChange).toHaveBeenLastCalledWith(5);
});

it("keeps the search and the sort in the toolbar row and the choosers in the panel", async () => {
  const { onSortByChange } = renderToolbar({});
  const search = screen.getByRole("searchbox");
  const sort = screen.getByRole("button", { name: m.admin_posts_sort_label() });
  const row = search.closest(".admin-frame-toolbar");
  expect(row?.contains(filterButton())).toBe(true);
  expect(row?.contains(sort)).toBe(true);
  expect(row?.querySelector('[role="tablist"]')).not.toBeNull();
  expect(
    screen.queryByRole("button", { name: m.admin_posts_filter_category() }),
  ).toBeNull();

  fireEvent.click(sort);
  fireEvent.click(
    await findInPopover("menuitemradio", {
      name: m.admin_posts_sort_recent_pub(),
    }),
  );
  expect(onSortByChange).toHaveBeenCalledWith("publishedAt");

  await openFilters();
  expect(
    screen.queryByRole("radiogroup", { name: m.admin_posts_sort_label() }),
  ).toBeNull();
});

it("shows the chosen filters as removable chips and counts them on the button", async () => {
  const { onCategoryChange, onTagChange, onClearTaxonomy } = renderToolbar({
    category: 2,
    tag: 5,
  });
  await screen.findByText(
    m.admin_posts_filter_chip_category({ name: "Notes" }),
  );
  await screen.findByText(m.admin_posts_filter_chip_tag({ name: "Rust" }));
  expect(filterButton().textContent).toBe(`${m.admin_posts_filter_button()}2`);

  fireEvent.click(
    screen.getByRole("button", {
      name: m.admin_posts_filter_remove({ name: "Notes" }),
    }),
  );
  expect(onCategoryChange).toHaveBeenLastCalledWith(undefined);
  fireEvent.click(
    screen.getByRole("button", {
      name: m.admin_posts_filter_remove({ name: "Rust" }),
    }),
  );
  expect(onTagChange).toHaveBeenLastCalledWith(undefined);
  fireEvent.click(
    screen.getByRole("button", { name: m.admin_posts_clear_filters() }),
  );
  expect(onClearTaxonomy).toHaveBeenCalledOnce();
});

it("names the uncategorized filter and shows no chips without a filter", async () => {
  renderToolbar({});
  expect(screen.queryByText(/：|: /)).toBeNull();
  expect(filterButton().textContent).toBe(m.admin_posts_filter_button());
  cleanup();

  renderToolbar({ category: "none" });
  await screen.findByText(
    m.admin_posts_filter_chip_category({ name: m.post_uncategorized() }),
  );
});

it("clears a chosen filter through the all options of the panel", async () => {
  const { onCategoryChange, onTagChange } = renderToolbar({
    category: 2,
    tag: 5,
  });
  await openFilters();

  await pick(
    m.admin_posts_filter_category(),
    m.admin_posts_filter_category_all(),
  );
  expect(onCategoryChange).toHaveBeenLastCalledWith(undefined);
  await pick(m.admin_posts_filter_tag(), m.admin_posts_filter_tag_all());
  expect(onTagChange).toHaveBeenLastCalledWith(undefined);
});

it("drops a filter whose category or tag no longer exists without a history entry", async () => {
  const stale = renderToolbar({ category: 99 });
  await waitFor(() =>
    expect(stale.onCategoryChange).toHaveBeenCalledWith(undefined, true),
  );
  cleanup();
  const staleTag = renderToolbar({ tag: 99 });
  await waitFor(() =>
    expect(staleTag.onTagChange).toHaveBeenCalledWith(undefined, true),
  );
  expect(staleTag.onCategoryChange).not.toHaveBeenCalled();
});

it("opens the categories and tags sheet from the panel and closes the panel", async () => {
  const { onManageTaxonomy } = renderToolbar({});
  await openFilters();
  const manage = screen.getByRole("button", {
    name: m.admin_posts_manage_taxonomy(),
  });
  expect(manage.getAttribute("aria-haspopup")).toBe("dialog");
  fireEvent.click(manage);
  expect(onManageTaxonomy).toHaveBeenCalledOnce();
  expect(
    screen.queryByRole("dialog", { name: m.admin_posts_filter_button() }),
  ).toBeNull();
  expect(filterButton().getAttribute("aria-expanded")).toBe("false");
});

it("below 1024px puts the search on its own row and moves the sort into a bottom sheet", async () => {
  const { onSortByChange } = renderToolbar({}, { wide: false });
  const tabs = screen.getAllByRole("tab")[0]!.closest(".admin-frame-toolbar");
  expect(tabs?.contains(screen.getByRole("searchbox"))).toBe(false);
  expect(tabs?.contains(filterButton())).toBe(false);
  expect(
    screen.queryByRole("button", { name: m.admin_posts_sort_label() }),
  ).toBeNull();

  fireEvent.click(filterButton());
  const sheet = await screen.findByRole("dialog", {
    name: m.admin_posts_filter_button(),
  });
  expect(sheet.getAttribute("data-side")).toBe("bottom");
  fireEvent.click(
    screen.getByRole("radio", { name: m.admin_posts_sort_recent_pub() }),
  );
  expect(onSortByChange).toHaveBeenCalledWith("publishedAt");

  fireEvent.click(screen.getByRole("button", { name: m.common_close() }));
  expect(
    screen.queryByRole("dialog", { name: m.admin_posts_filter_button() }),
  ).toBeNull();
});
