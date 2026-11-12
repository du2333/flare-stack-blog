// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createElement, type ComponentProps } from "react";
import { findInPopover } from "tests/popover";
import { afterEach, expect, it, vi } from "vitest";
import { m } from "@/paraglide/messages";
import type { PostPopularity } from "../types";
import { PostsStatusTabs, PostsTools } from "./posts-toolbar";

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

function renderTools(
  filters: { category?: number | "none"; tag?: number } = {},
  {
    popularity,
    sortBy = "updatedAt",
  }: Partial<
    Pick<ComponentProps<typeof PostsTools>, "popularity" | "sortBy">
  > = {},
) {
  const onCategoryChange = vi.fn();
  const onTagChange = vi.fn();
  const onSortByChange = vi.fn();
  render(
    createElement(
      QueryClientProvider,
      {
        client: new QueryClient({
          defaultOptions: { queries: { retry: false } },
        }),
      },
      createElement(PostsTools, {
        searchTerm: "",
        onSearchChange: vi.fn(),
        sortBy,
        onSortByChange,
        onCategoryChange,
        onTagChange,
        popularity,
        ...filters,
      }),
    ),
  );
  return { onCategoryChange, onTagChange, onSortByChange };
}

const chip = (name: string) => screen.getByRole("button", { name });

async function pick(menu: string, option: string) {
  fireEvent.click(chip(menu));
  fireEvent.click(await findInPopover("menuitemradio", { name: option }));
}

it("offers the unpublished changes filter with its count between published and draft", () => {
  const onStatusChange = vi.fn();
  render(
    createElement(PostsStatusTabs, {
      status: "ALL",
      statusCounts: { published: 5, draft: 2, unpublishedChanges: 1 },
      onStatusChange,
    }),
  );
  expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
    `${m.admin_posts_filter_all()} 7`,
    `${m.admin_posts_filter_published()} 5`,
    `${m.admin_posts_filter_changed()} 1`,
    `${m.admin_posts_filter_draft()} 2`,
  ]);
  fireEvent.click(
    screen.getByRole("tab", {
      name: new RegExp(m.admin_posts_filter_changed()),
    }),
  );
  expect(onStatusChange).toHaveBeenCalledWith("CHANGED");
});

it("filters by a category, by uncategorized posts and by a tag from their chips", async () => {
  const { onCategoryChange, onTagChange } = renderTools();
  await pick(m.admin_posts_filter_category(), "Notes");
  expect(onCategoryChange).toHaveBeenLastCalledWith(2);
  await pick(m.admin_posts_filter_category(), m.post_uncategorized());
  expect(onCategoryChange).toHaveBeenLastCalledWith("none");
  await pick(m.admin_posts_filter_tag(), "Rust");
  expect(onTagChange).toHaveBeenLastCalledWith(5);
});

it("shows a chip's name alone until it filters, then its value, tinted", async () => {
  renderTools({ category: 2 });
  const category = chip(m.admin_posts_filter_category());
  await waitFor(() =>
    expect(category.textContent).toBe(
      `${m.admin_posts_filter_category()}Notes`,
    ),
  );
  expect(category.hasAttribute("data-active")).toBe(true);
  const tag = chip(m.admin_posts_filter_tag());
  expect(tag.textContent).toBe(m.admin_posts_filter_tag());
  expect(tag.hasAttribute("data-active")).toBe(false);
});

it("clears a chosen filter through the all option of its chip", async () => {
  const { onCategoryChange, onTagChange } = renderTools({
    category: 2,
    tag: 5,
  });
  await pick(
    m.admin_posts_filter_category(),
    m.admin_posts_filter_category_all(),
  );
  expect(onCategoryChange).toHaveBeenLastCalledWith(undefined);
  await pick(m.admin_posts_filter_tag(), m.admin_posts_filter_tag_all());
  expect(onTagChange).toHaveBeenLastCalledWith(undefined);
});

it("drops a filter whose category or tag no longer exists without a history entry", async () => {
  const stale = renderTools({ category: 99 });
  await waitFor(() =>
    expect(stale.onCategoryChange).toHaveBeenCalledWith(undefined, true),
  );
  cleanup();
  const staleTag = renderTools({ tag: 99 });
  await waitFor(() =>
    expect(staleTag.onTagChange).toHaveBeenCalledWith(undefined, true),
  );
  expect(staleTag.onCategoryChange).not.toHaveBeenCalled();
});

it("offers the sorts by comments, and by views only while views can be read", async () => {
  const sorts = async (popularity: PostPopularity) => {
    renderTools({}, { popularity });
    fireEvent.click(chip(m.admin_posts_sort_label()));
    await findInPopover("menuitemradio", {
      name: m.admin_posts_sort_recent_upd(),
    });
    const options = screen
      .getAllByRole("menuitemradio")
      .map((option) => option.textContent);
    cleanup();
    return options;
  };
  const withoutViews = [
    m.admin_posts_sort_recent_pub(),
    m.admin_posts_sort_recent_upd(),
    m.admin_posts_sort_comments(),
  ];
  expect(await sorts("ready")).toEqual([
    ...withoutViews.slice(0, 2),
    m.admin_posts_sort_views(),
    m.admin_posts_sort_comments(),
  ]);
  for (const popularity of ["unconfigured", "missing", "expired"] as const)
    expect(await sorts(popularity)).toEqual(withoutViews);
});

it("names the recent sort instead of the views when the views cannot be read", () => {
  renderTools({}, { popularity: "missing", sortBy: "viewCount" });
  expect(chip(m.admin_posts_sort_label()).textContent).toBe(
    `${m.admin_posts_sort_label()}${m.admin_posts_sort_recent_upd()}`,
  );
});

it('puts the caret in the search on "/", unless one is typing elsewhere', () => {
  renderTools();
  const search = screen.getByRole("searchbox");
  fireEvent.keyDown(document.body, { key: "/" });
  expect(document.activeElement).toBe(search);
  search.blur();
  const other = document.createElement("input");
  document.body.appendChild(other);
  other.focus();
  fireEvent.keyDown(other, { key: "/" });
  expect(document.activeElement).toBe(other);
  other.remove();
});
