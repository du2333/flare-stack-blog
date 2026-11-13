// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type ComponentProps, createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { findInPopover } from "tests/popover";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { AdminPostListItem } from "../types";
import { PostListColumns, PostRow } from "./post-row";

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
      index: 0,
      sortBy: "updatedAt",
      pinPending: false,
      onTogglePin: vi.fn(),
      onDelete: vi.fn(),
      onUnpublish: vi.fn(),
      ...props,
    }),
  );
}

/** The cells of the row that carry a class, by it. */
const cells = (name: string) =>
  [...document.querySelectorAll(`.post-row > .${name}`)].map(
    (cell) => cell.textContent,
  );

it("labels a draft, a published post and a published post with changes", () => {
  const state = () =>
    document.querySelector(".post-row > .post-state")?.textContent;
  renderRow({ status: "draft" });
  expect(state()).toBe(m.admin_posts_status_draft());
  cleanup();

  renderRow(PUBLISHED);
  expect(state()).toBe(m.admin_posts_status_published());
  cleanup();

  renderRow({ ...PUBLISHED, hasUnpublishedChanges: true });
  expect(state()).toBe(m.admin_posts_status_published_changed());
});

it("opens the editor from the title, the one link of the row, with no slug", () => {
  renderRow({ title: "Hello", slug: "hello-slug", status: "draft" });

  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(1);
  expect(links[0]!.textContent).toBe("Hello");
  expect(links[0]!.getAttribute("href")).toBe("/admin/posts/edit/1");
  expect(screen.queryByText("hello-slug")).toBeNull();
});

it("names an untitled post as such", () => {
  renderRow({ title: "  " });
  expect(screen.getByRole("link").textContent).toBe(m.common_untitled());
});

it("opens the published page beside the menu, which holds every action", async () => {
  const onTogglePin = vi.fn();
  renderRow(PUBLISHED, { onTogglePin });

  expect(
    screen
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label")),
  ).toEqual([
    m.admin_posts_view_published_named({ title: "Post" }),
    m.admin_posts_more_named({ title: "Post" }),
  ]);
  fireEvent.click(
    screen.getByRole("button", {
      name: m.admin_posts_more_named({ title: "Post" }),
    }),
  );
  await findInPopover("menuitem", { name: m.admin_posts_action_pin() });
  expect(
    screen.getAllByRole("menuitem").map((item) => item.textContent),
  ).toEqual([
    m.admin_posts_view_published(),
    m.admin_posts_action_pin(),
    m.editor_header_unpublish(),
    m.admin_posts_action_delete_post(),
  ]);
  fireEvent.click(
    screen.getByRole("menuitem", { name: m.admin_posts_action_pin() }),
  );
  expect(onTogglePin).toHaveBeenCalledOnce();
});

it("offers a draft no published page and no unpublishing", async () => {
  renderRow({ pinnedAt: daysAgo(1) });
  expect(screen.getAllByRole("button")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button"));
  await findInPopover("menuitem", { name: m.admin_posts_action_unpin() });
  expect(
    screen.getAllByRole("menuitem").map((item) => item.textContent),
  ).toEqual([m.admin_posts_action_unpin(), m.admin_posts_action_delete_post()]);
});

it("names the category first, then up to three tags, then how many more", () => {
  const tags = ["Rust", "Go", "C", "Zig", "Lua"].map((name, index) => ({
    id: index + 1,
    name,
  }));
  renderRow({ category: { id: 3, name: "Notes" }, tags });
  const sub = document.querySelector(".post-sub")!;
  expect(
    [...sub.children]
      .filter((part) => !part.classList.contains("post-sub-only"))
      .map((part) => part.textContent),
  ).toEqual(["Notes", "#Rust", "#Go", "#C", "+2"]);
  cleanup();

  renderRow({});
  expect(
    document.querySelector(".post-sub > span:not(.post-sub-only)")?.textContent,
  ).toBe(m.post_uncategorized());
});

it("shows the modified time as a relative time, with the full date and time on hover", () => {
  const updatedAt = daysAgo(27);
  renderRow({ updatedAt, publishedAt: daysAgo(40) });

  const [time] = screen.getAllByText(m.time_ago_days({ count: 27 }));
  expect(time!.tagName).toBe("TIME");
  expect(time!.getAttribute("datetime")).toBe(updatedAt.toISOString());
  expect(time!.getAttribute("title")).toBe(
    formatDate(updatedAt, { includeTime: true }),
  );
});

it("shows the publish time when the list is sorted by it", () => {
  const publishedAt = daysAgo(40);
  renderRow(
    { updatedAt: daysAgo(2), publishedAt, status: "published" },
    { sortBy: "publishedAt" },
  );

  const [time] = screen.getAllByText(m.time_ago_days({ count: 40 }));
  expect(time!.getAttribute("datetime")).toBe(publishedAt.toISOString());
});

it("names the pin for screen readers, after the title, only on pinned posts", () => {
  renderRow({ pinnedAt: daysAgo(1) });
  const pin = screen.getByRole("img", { name: m.admin_posts_pinned() });
  expect(pin.previousElementSibling?.tagName).toBe("A");
  cleanup();

  renderRow({ pinnedAt: null });
  expect(
    screen.queryByRole("img", { name: m.admin_posts_pinned() }),
  ).toBeNull();
});

it("shows the views and the comments, and 0 only for a count that is known", () => {
  renderRow({ ...PUBLISHED, viewCount: 1234, commentCount: 7 });
  expect(cells("post-count")).toEqual([(1234).toLocaleString(), "7"]);
  cleanup();

  renderRow(
    { ...PUBLISHED, viewCount: 0, commentCount: 0 },
    { popularity: "ready" },
  );
  expect(cells("post-count")).toEqual(["0", "0"]);
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
    const views = document.querySelector(".post-row > .post-count")!;
    expect(views.textContent).toBe("—");
    expect(views.getAttribute("title")).toBe(reason);
    cleanup();
  }
});

it("sorts from the column names: comments always, views while they can be read, the time by what the list shows", () => {
  const onSortByChange = vi.fn();
  const columns = (
    props: Partial<ComponentProps<typeof PostListColumns>> = {},
  ) =>
    createElement(PostListColumns, {
      sortBy: "updatedAt",
      viewsSortable: true,
      onSortByChange,
      ...props,
    });
  const sortButton = (column: string) =>
    screen.queryByRole("button", {
      name: m.admin_posts_sort_by_column({ column }),
    });

  render(columns());
  fireEvent.click(sortButton(m.admin_posts_col_views())!);
  expect(onSortByChange).toHaveBeenLastCalledWith("viewCount");
  fireEvent.click(sortButton(m.admin_posts_col_comments())!);
  expect(onSortByChange).toHaveBeenLastCalledWith("commentCount");
  expect(
    sortButton(m.admin_posts_sort_recent_upd())!.getAttribute("aria-pressed"),
  ).toBe("true");
  cleanup();

  render(columns({ viewsSortable: false, sortBy: "publishedAt" }));
  expect(sortButton(m.admin_posts_col_views())).toBeNull();
  expect(screen.getByText(m.admin_posts_col_views())).toBeDefined();
  expect(sortButton(m.admin_posts_col_published_at())).not.toBeNull();
  expect(sortButton(m.admin_posts_sort_recent_upd())).toBeNull();
});
