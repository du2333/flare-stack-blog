// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type ComponentProps, createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { AdminPostListItem } from "../types";
import { PostRow } from "./post-row";

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
  category: null,
  tags: [],
  createdAt: new Date("2026-10-01"),
  updatedAt: new Date("2026-10-02"),
} as AdminPostListItem;

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

function renderRow(
  post: Partial<AdminPostListItem>,
  props: Partial<ComponentProps<typeof PostRow>> = {},
) {
  render(
    createElement(
      "table",
      null,
      createElement(
        "tbody",
        null,
        createElement(PostRow, {
          post: { ...POST, ...post },
          sortBy: "updatedAt",
          onDelete: vi.fn(),
          ...props,
        }),
      ),
    ),
  );
}

it("badges a draft, a published post and a published post with changes", () => {
  renderRow({ status: "draft" });
  expect(screen.getByText(m.admin_posts_status_draft())).toBeDefined();
  cleanup();

  renderRow({ status: "published", publicSlug: "post" });
  expect(screen.getByText(m.admin_posts_status_published())).toBeDefined();
  cleanup();

  renderRow({
    status: "published",
    publicSlug: "post",
    hasUnpublishedChanges: true,
  });
  expect(
    screen.getByText(m.admin_posts_status_published_changed()),
  ).toBeDefined();
});

it("opens the editor from the title, with the badge right after it and no edit link or slug", () => {
  renderRow({ title: "Hello", slug: "hello-slug", status: "draft" });

  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(1);
  expect(links[0]!.textContent).toBe("Hello");
  expect(links[0]!.getAttribute("href")).toBe("/admin/posts/edit/1");
  expect(links[0]!.nextElementSibling?.textContent).toBe(
    m.admin_posts_status_draft(),
  );
  expect(screen.queryByText("hello-slug")).toBeNull();
});

it("shows the draft category and tags as filter buttons", () => {
  const onFilterCategory = vi.fn();
  const onFilterTag = vi.fn();
  renderRow(
    {
      category: { id: 3, name: "Notes" },
      tags: [
        { id: 7, name: "Rust" },
        { id: 9, name: "Go" },
      ],
    },
    { onFilterCategory, onFilterTag },
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: m.admin_posts_filter_by_category({ name: "Notes" }),
    }),
  );
  expect(onFilterCategory).toHaveBeenCalledWith(3);
  fireEvent.click(
    screen.getByRole("button", {
      name: m.admin_posts_filter_by_tag({ name: "Go" }),
    }),
  );
  expect(onFilterTag).toHaveBeenCalledWith(9);
  expect(screen.queryByText(m.post_uncategorized())).toBeNull();
});

it("hints that a post has neither category nor tags instead of an empty line", () => {
  renderRow({});

  expect(screen.getByText(m.post_uncategorized())).toBeDefined();
  expect(
    screen
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label")),
  ).toEqual([m.admin_posts_more_named({ title: "Post" })]);
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

it("names the pin for screen readers and keeps unpinned rows from reserving its place", () => {
  renderRow({ pinnedAt: daysAgo(1) });
  const pin = screen.getByRole("img", { name: m.admin_posts_pinned() });
  expect(pin.previousElementSibling?.tagName).toBe("A");
  cleanup();

  renderRow({ pinnedAt: null });
  expect(
    screen.queryByRole("img", { name: m.admin_posts_pinned() }),
  ).toBeNull();
  expect(screen.getByRole("link").parentElement?.firstElementChild).toBe(
    screen.getByRole("link"),
  );
});
