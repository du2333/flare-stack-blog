// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { createElement, type ComponentType, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import { m } from "@/paraglide/messages";
import { DashboardComments } from "./dashboard-comments";
import { DashboardRecentPosts } from "./dashboard-recent-posts";
import { DashboardStats } from "./dashboard-stats";
import { DashboardTiles } from "./dashboard-tiles";

vi.mock("@/lib/orpc", () => ({
  orpcClient: {},
  orpc: {
    dashboard: {
      key: () => ["dashboard"],
      overview: { queryKey: () => ["dashboard", "overview"] },
    },
  },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) =>
    createElement("a", { ...rest, href: to }, children),
  createLink: (Component: ComponentType<Record<string, unknown>>) =>
    function Linked({ to, ...rest }: { to: string }) {
      return createElement(Component, { ...rest, href: to });
    },
  ClientOnly: ({ children }: { children: ReactNode }) => children,
}));

afterEach(cleanup);

const NEW_SITE: DashboardOverview = {
  popularityAlert: null,
  adminEmailNeedsSetup: false,
  defaultSiteIdentity: false,
  update: null,
  stats: {
    publishedPosts: 0,
    draftPosts: 0,
    comments: 0,
    recentComments: 0,
    approvedFriendLinks: 0,
    pendingFriendLinks: 0,
  },
  popularity: {
    state: "ready",
    windowStart: 0,
    windowEnd: 0,
    totalViews: 0,
    topPosts: [],
  },
  writingActivity: [],
  latestDraft: null,
  recentPosts: [],
  pendingFriendLinks: { items: [], remainingCount: 0 },
  unrepliedComments: { items: [], total: 0 },
};

function renderPage(node: ReactNode) {
  render(
    createElement(QueryClientProvider, { client: new QueryClient() }, node),
  );
}

it("draws every tile quiet and still a link on a brand-new site", () => {
  renderPage(createElement(DashboardTiles, { data: NEW_SITE }));

  const tiles = screen.getAllByRole("link");
  expect(tiles).toHaveLength(3);
  for (const tile of tiles) {
    expect(tile.hasAttribute("data-quiet")).toBe(true);
    expect(within(tile).getByText(m.dashboard_tile_none())).toBeTruthy();
  }
  expect(tiles.map((tile) => tile.getAttribute("href"))).toEqual([
    "/admin/comments",
    "/admin/friend-links",
    "/admin/posts",
  ]);
});

it("gives the Comments and recent edits one sentence each when there is nothing", () => {
  renderPage(
    createElement(
      "div",
      null,
      createElement(DashboardComments, { comments: [], total: 0 }),
      createElement(DashboardRecentPosts, { recentPosts: [] }),
    ),
  );

  expect(screen.getByText(m.dashboard_comments_empty())).toBeTruthy();
  expect(screen.getByText(m.dashboard_recent_empty())).toBeTruthy();
  expect(screen.queryByText(/查看全部|View all/)).toBeNull();
});

it("shows zeroes, not blanks, in the site status", () => {
  renderPage(
    createElement(DashboardStats, {
      stats: NEW_SITE.stats,
      popularity: { ...NEW_SITE.popularity, state: "unconfigured" },
    }),
  );

  expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(3);
  // Views are unknown without Umami: a dash and the reason, never a number.
  expect(screen.getByText("—")).toBeTruthy();
  expect(screen.getByText(m.dashboard_stat_views_unconfigured())).toBeTruthy();
});
