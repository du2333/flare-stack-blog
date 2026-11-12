// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { findInPopover } from "tests/popover";
import { afterEach, expect, it, vi } from "vitest";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import { m } from "@/paraglide/messages";
import { DashboardTiles } from "./dashboard-tiles";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) =>
    createElement("a", { ...rest, href: to }, children),
  useNavigate: () => navigate,
}));
// Unmount the menu as soon as it closes; exit motion is not under test.
vi.mock("@/hooks/use-motion", () => ({
  MOTION: { popover: 120 },
  useMotionPresence: (open: boolean) => open,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const SITE: DashboardOverview = {
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
    state: "unconfigured",
    windowStart: null,
    windowEnd: null,
    totalViews: 0,
    topPosts: [],
  },
  writingActivity: [],
  latestDraft: null,
  recentPosts: [],
  pendingFriendLinks: { items: [], remainingCount: 0 },
  unrepliedComments: { items: [], total: 0 },
};

const UPDATE = { latestVersion: "9.9.9", releaseUrl: "https://example.com/r" };

it("links the settings tile to its fix when there is one notice", () => {
  render(
    createElement(DashboardTiles, {
      data: { ...SITE, adminEmailNeedsSetup: true },
    }),
  );

  const tile = screen.getByRole("link", {
    name: new RegExp(m.admin_overview_email_needs_setup()),
  });
  expect(tile.getAttribute("href")).toBe("/admin/settings/notifications");
  expect(screen.queryByRole("button")).toBeNull();
});

it("opens a menu of every notice, with its explanation, when there are several", async () => {
  render(
    createElement(DashboardTiles, {
      data: {
        ...SITE,
        adminEmailNeedsSetup: true,
        defaultSiteIdentity: true,
        update: UPDATE,
      },
    }),
  );

  fireEvent.click(
    screen.getByRole("button", { name: m.dashboard_tile_notices() }),
  );

  const email = await findInPopover("menuitem", {
    name: new RegExp(m.admin_overview_email_needs_setup_desc()),
  });
  expect(email.textContent).toContain(m.admin_overview_email_needs_setup());
  const update = await findInPopover("menuitem", {
    name: new RegExp(UPDATE.latestVersion),
  });
  expect(update.textContent).toContain(
    m.admin_overview_update_available_desc({ current: __APP_VERSION__ }),
  );
  expect(screen.getAllByRole("menuitem")).toHaveLength(3);

  fireEvent.click(email);
  expect(navigate).toHaveBeenCalledWith({
    to: "/admin/settings/notifications",
  });
});

it("opens the release notes in a new tab from the new-version item", async () => {
  const open = vi.spyOn(window, "open").mockReturnValue(null);
  render(
    createElement(DashboardTiles, {
      data: { ...SITE, defaultSiteIdentity: true, update: UPDATE },
    }),
  );

  fireEvent.click(
    screen.getByRole("button", { name: m.dashboard_tile_notices() }),
  );
  fireEvent.click(
    await findInPopover("menuitem", { name: new RegExp(UPDATE.latestVersion) }),
  );

  expect(open).toHaveBeenCalledWith(
    UPDATE.releaseUrl,
    "_blank",
    "noopener,noreferrer",
  );
  expect(navigate).not.toHaveBeenCalled();
});
