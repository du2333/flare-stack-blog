// @vitest-environment jsdom
import { ORPCError } from "@orpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { m } from "@/paraglide/messages";
import { DashboardNotices } from "./dashboard-notices";

const sync = vi.hoisted(() => vi.fn());
vi.mock("@/lib/orpc", () => ({
  orpcClient: { postPopularity: { sync } },
  orpc: { dashboard: { overview: { key: () => ["dashboard", "overview"] } } },
}));
vi.mock("@/features/post-popularity/queries", () => ({
  postPopularityStatusQuery: { queryKey: ["post-popularity", "status"] },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) =>
    createElement("a", { ...rest, href: to }, children),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const status = { configured: true, expired: false };

function renderExpired() {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(DashboardNotices, {
        update: null,
        popularityAlert: "expired",
        adminEmailNeedsSetup: false,
        defaultSiteIdentity: false,
      }),
    ),
  );
  return { invalidate };
}

const syncButton = () =>
  screen.getByRole("button", { name: m.admin_overview_popularity_sync() });

it("offers the sync in the banner and sends nothing to the maintenance page yet", () => {
  renderExpired();

  expect(screen.getByText(m.admin_overview_popularity_expired())).toBeTruthy();
  expect(syncButton()).toBeTruthy();
  expect(screen.queryByRole("link")).toBeNull();
});

it("shows progress while syncing and refreshes the overview on success", async () => {
  let finish: (value: typeof status) => void = () => {};
  sync.mockReturnValue(new Promise((resolve) => (finish = resolve)));
  const { invalidate } = renderExpired();

  fireEvent.click(syncButton());
  const busy = await screen.findByRole("button", {
    name: m.admin_overview_popularity_syncing(),
  });
  expect(busy.hasAttribute("disabled")).toBe(true);

  finish(status);
  await vi.waitFor(() =>
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["dashboard", "overview"],
    }),
  );
  expect(screen.queryByRole("alert")).toBeNull();
});

it("states the service's reason and links to the maintenance page when the sync fails", async () => {
  sync.mockRejectedValue(
    new ORPCError("SYNC_FAILED", { defined: true, status: 502 }),
  );
  const { invalidate } = renderExpired();

  fireEvent.click(syncButton());

  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain(
    m.admin_overview_popularity_sync_failed_desc(),
  );
  expect(
    screen
      .getByRole("link", {
        name: m.admin_overview_popularity_maintenance_link(),
      })
      .getAttribute("href"),
  ).toBe("/admin/settings/maintenance");
  expect(syncButton().hasAttribute("disabled")).toBe(false);
  expect(invalidate).not.toHaveBeenCalledWith({
    queryKey: ["dashboard", "overview"],
  });
});

it("says the server was unreachable when the request never got an answer", async () => {
  sync.mockRejectedValue(new TypeError("Failed to fetch"));
  renderExpired();

  fireEvent.click(syncButton());

  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain(
    m.admin_overview_popularity_sync_unreachable_desc(),
  );
});

it("sends the default-identity notice to the site settings, which keep the title and author", () => {
  render(
    createElement(DashboardNotices, {
      update: null,
      popularityAlert: null,
      adminEmailNeedsSetup: false,
      defaultSiteIdentity: true,
    }),
  );
  expect(
    screen
      .getByRole("link", {
        name: new RegExp(m.admin_overview_default_site_identity()),
      })
      .getAttribute("href"),
  ).toBe("/admin/settings/site");
});
