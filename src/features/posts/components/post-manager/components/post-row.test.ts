// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type ComponentProps, createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { findInPopover } from "tests/popover";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { AdminPostListItem } from "../types";
import { PostListHeader, PostRow, taxonomySummary } from "./post-row";

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({
    children,
    params,
    className,
  }: {
    children: ReactNode;
    params: { id: string };
    className?: string;
  }) =>
    createElement(
      "a",
      { href: `/admin/posts/edit/${params.id}`, className },
      children,
    ),
  ClientOnly: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/hooks/use-motion", () => ({
  MOTION: { popover: 120 },
  useMotionPresence: (open: boolean) => open,
}));

afterEach(cleanup);

const POST: AdminPostListItem = {
  id: 1,
  title: "Post",
  summary: null,
  slug: "post",
  publicSlug: null,
  status: "draft",
  hasUnpublishedChanges: false,
  publishedAt: null,
  pinnedAt: null,
  commentCount: 0,
  category: null,
  tags: [],
  createdAt: new Date("2026-10-01"),
  updatedAt: new Date("2026-10-02"),
} as AdminPostListItem;

const PUBLISHED = {
  status: "published",
  publicSlug: "post",
} satisfies Partial<AdminPostListItem>;

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

function renderRow(
  post: Partial<AdminPostListItem>,
  props: Partial<ComponentProps<typeof PostRow>> = {},
) {
  render(
    createElement(PostRow, {
      post: { ...POST, ...post },
      sortBy: "updatedAt",
      onDelete: vi.fn(),
      ...props,
    }),
  );
}

/** The text of one cell of the row, by its class. */
const cell = (name: string) =>
  document.querySelector(`.post-row-${name}`)?.textContent;

it("badges a draft, a published post and a published post with changes", () => {
  renderRow({ status: "draft" });
  expect(screen.getByText(m.admin_posts_status_draft())).toBeDefined();
  cleanup();

  renderRow(PUBLISHED);
  expect(screen.getByText(m.admin_posts_status_published())).toBeDefined();
  cleanup();

  renderRow({ ...PUBLISHED, hasUnpublishedChanges: true });
  expect(
    screen.getByText(m.admin_posts_status_published_changed()),
  ).toBeDefined();
});

it("opens the editor from the title, the one link of the row, with no edit link or slug", () => {
  renderRow({ title: "Hello", slug: "hello-slug", status: "draft" });

  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(1);
  expect(links[0]!.textContent).toBe("Hello");
  expect(links[0]!.getAttribute("href")).toBe("/admin/posts/edit/1");
  expect(screen.queryByText("hello-slug")).toBeNull();
});

it("leaves the menu as the row's only button, with every action", async () => {
  renderRow(
    { ...PUBLISHED, category: { id: 3, name: "Notes" } },
    {
      onTogglePin: vi.fn(),
      onUnpublish: vi.fn(),
    },
  );

  expect(
    screen
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label")),
  ).toEqual([m.admin_posts_more_named({ title: "Post" })]);
  fireEvent.click(screen.getByRole("button"));
  await findInPopover("menuitem", { name: m.admin_posts_action_pin() });
  expect(
    screen.getAllByRole("menuitem").map((item) => item.textContent),
  ).toEqual([
    m.admin_posts_action_view_live(),
    m.admin_posts_action_pin(),
    m.editor_header_unpublish(),
    m.admin_posts_action_delete_post(),
  ]);
});

it("names the category first, then up to two tags, then how many more", () => {
  const tags = ["Rust", "Go", "C", "Zig"].map((name, index) => ({
    id: index + 1,
    name,
  }));
  expect(taxonomySummary({ id: 3, name: "Notes" }, tags)).toEqual({
    category: "Notes",
    tags: ["Rust", "Go"],
    more: 2,
    full: "Notes  #Rust  #Go  #C  #Zig",
  });
  expect(taxonomySummary(null, tags.slice(0, 1))).toMatchObject({
    category: null,
    tags: ["Rust"],
    more: 0,
  });

  renderRow({ category: { id: 3, name: "Notes" }, tags });
  expect(cell("taxonomy")).toBe("Notes#Rust#Go+2");
  expect(
    document.querySelector(".post-row-taxonomy")?.getAttribute("title"),
  ).toBe("Notes  #Rust  #Go  #C  #Zig");
});

it("shows a dash, not a hint line, for a post with neither category nor tags", () => {
  renderRow({});
  expect(cell("taxonomy")).toBe("—");
});

it("shows the modified time as a relative time, with the full date and time on hover", () => {
  const updatedAt = daysAgo(27);
  renderRow({ updatedAt, publishedAt: daysAgo(40) });

  const time = screen.getByText(m.time_ago_days({ count: 27 }));
  expect(time.tagName).toBe("TIME");
  expect(time.getAttribute("datetime")).toBe(updatedAt.toISOString());
  expect(time.getAttribute("title")).toBe(
    formatDate(updatedAt, { includeTime: true }),
  );
});

it("shows the publish time when the list is sorted by it", () => {
  const publishedAt = daysAgo(40);
  renderRow(
    { updatedAt: daysAgo(2), publishedAt, status: "published" },
    { sortBy: "publishedAt" },
  );

  const time = screen.getByText(m.time_ago_days({ count: 40 }));
  expect(time.getAttribute("datetime")).toBe(publishedAt.toISOString());
});

it("names the pin for screen readers, before the title, and keeps unpinned rows from reserving its place", () => {
  renderRow({ pinnedAt: daysAgo(1) });
  const pin = screen.getByRole("img", { name: m.admin_posts_pinned() });
  expect(pin.nextElementSibling?.tagName).toBe("A");
  cleanup();

  renderRow({ pinnedAt: null });
  expect(
    screen.queryByRole("img", { name: m.admin_posts_pinned() }),
  ).toBeNull();
  expect(screen.getByRole("link").parentElement?.firstElementChild).toBe(
    screen.getByRole("link"),
  );
});

it("shows the views and the comments, and 0 only for a count that is known", () => {
  renderRow({ ...PUBLISHED, viewCount: 1234, commentCount: 7 });
  expect(cell("views")).toBe((1234).toLocaleString());
  expect(cell("comments")).toBe("7");
  cleanup();

  renderRow(
    { ...PUBLISHED, viewCount: 0, commentCount: 0 },
    {
      popularity: "ready",
    },
  );
  expect(cell("views")).toBe("0");
  expect(cell("comments")).toBe("0");
});

it("shows a dash with the reason where the views are not known, never 0", () => {
  const cases: Array<
    [
      Partial<AdminPostListItem>,
      ComponentProps<typeof PostRow>["popularity"],
      string,
    ]
  > = [
    [PUBLISHED, "unconfigured", m.admin_posts_views_unconfigured()],
    [PUBLISHED, "missing", m.admin_posts_views_missing()],
    [PUBLISHED, "expired", m.admin_posts_views_expired()],
    [{ status: "draft" }, "ready", m.admin_posts_views_draft()],
  ];
  for (const [post, popularity, reason] of cases) {
    renderRow(post, { popularity });
    expect(cell("views")).toBe(`—${reason}`);
    expect(
      document.querySelector(".post-row-views span")?.getAttribute("title"),
    ).toBe(reason);
    cleanup();
  }
});

it("sorts from the column names: comments always, views while they can be read, the time by what the list shows", () => {
  const onSortByChange = vi.fn();
  const header = (props: Partial<ComponentProps<typeof PostListHeader>> = {}) =>
    createElement(PostListHeader, {
      sortBy: "updatedAt",
      viewsSortable: true,
      onSortByChange,
      ...props,
    });
  const sortButton = (column: string) =>
    screen.queryByRole("button", {
      name: m.admin_posts_sort_by_column({ column }),
    });

  render(header());
  fireEvent.click(sortButton(m.admin_posts_col_views())!);
  expect(onSortByChange).toHaveBeenLastCalledWith("viewCount");
  fireEvent.click(sortButton(m.admin_posts_col_comments())!);
  expect(onSortByChange).toHaveBeenLastCalledWith("commentCount");
  expect(sortButton(m.admin_posts_sort_recent_upd())).not.toBeNull();
  expect(
    sortButton(m.admin_posts_sort_recent_upd())!.getAttribute("aria-pressed"),
  ).toBe("true");
  cleanup();

  render(header({ viewsSortable: false, sortBy: "publishedAt" }));
  expect(sortButton(m.admin_posts_col_views())).toBeNull();
  expect(screen.getByText(m.admin_posts_col_views())).toBeDefined();
  expect(sortButton(m.admin_posts_sort_recent_pub())).not.toBeNull();
  expect(sortButton(m.admin_posts_sort_recent_upd())).toBeNull();
});
