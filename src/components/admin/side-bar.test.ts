// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import zh from "../../../messages/zh.json";
import { m } from "@/paraglide/messages";
import { currentNavItem } from "./admin-nav";
import { SideBar } from "./side-bar";

const state = vi.hoisted(() => ({
  pathname: "/admin/posts",
  counts: { comments: 0, friendLinks: 0 },
}));

vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({}) }));
vi.mock("./admin-counts", () => ({ useAdminCounts: () => state.counts }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) =>
    createElement("a", { href: to, ...rest }, children),
  useLocation: ({
    select,
  }: {
    select: (location: { pathname: string }) => unknown;
  }) => select({ pathname: state.pathname }),
  useNavigate: () => vi.fn(),
  useRouteContext: () => ({ siteConfig: { title: "Blog" } }),
}));
vi.mock("@/features/auth/queries", () => ({ resetAuthBoundQueries: vi.fn() }));
vi.mock("@/lib/auth/auth-client", () => ({
  getAuthClient: () => ({ signOut: vi.fn() }),
  useSession: () => ({ data: { user: { name: "Admin", role: "admin" } } }),
}));
vi.mock("@/components/common/colour-scheme-provider", () => ({
  useColourScheme: () => ({
    colourSchemePreference: "system",
    setColourScheme: vi.fn(),
  }),
}));

beforeEach(() => {
  state.pathname = "/admin/posts";
  state.counts = { comments: 0, friendLinks: 0 };
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  HTMLDialogElement.prototype.close = vi.fn();
  HTMLDialogElement.prototype.showModal = vi.fn();
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: vi.fn(() => ({ cancel: vi.fn() })),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderSideBar() {
  return render(
    createElement(SideBar, {
      isMobileSidebarOpen: false,
      closeMobileSidebar: vi.fn(),
      collapsed: false,
      onToggleCollapse: vi.fn(),
    }),
  );
}

const nav = () => document.querySelector("nav")!;

describe("The Admin sidebar", () => {
  it("groups the entries by what there is to do", () => {
    renderSideBar();
    expect(within(nav()).getAllByRole("link")[0].getAttribute("href")).toBe(
      "/admin",
    );
    const groups = within(nav()).getAllByRole("group");
    expect(groups.map((group) => group.getAttribute("aria-label"))).toEqual([
      m.admin_sidebar_group_content(),
      m.admin_sidebar_group_engagement(),
      m.admin_sidebar_group_site(),
    ]);
    expect(
      groups.map((group) =>
        within(group)
          .getAllByRole("link")
          .map((link) => link.getAttribute("href")),
      ),
    ).toEqual([
      ["/admin/posts", "/admin/media", "/admin/taxonomy"],
      ["/admin/comments", "/admin/friend-links", "/admin/muted-users"],
      ["/admin/personalize", "/admin/access/api-keys", "/admin/settings/site"],
    ]);
    // The entries are named as the spec names them.
    expect(
      groups.flatMap((group) =>
        within(group)
          .getAllByRole("link")
          .map((link) => link.textContent),
      ),
    ).toEqual([
      m.admin_sidebar_posts(),
      m.admin_sidebar_media(),
      m.admin_sidebar_taxonomy(),
      m.admin_sidebar_comments(),
      m.admin_sidebar_friend_links(),
      m.muted_users_title(),
      m.admin_sidebar_personalize(),
      m.admin_sidebar_access(),
      m.admin_layout_settings(),
    ]);
    expect(zh.admin_sidebar_personalize).toBe("个性化");
    expect(zh.admin_layout_settings).toBe("设置");
  });

  it("marks the current entry as the page, not by colour alone", () => {
    state.pathname = "/admin/access/agent-skill";
    renderSideBar();
    const current = within(nav())
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.getAttribute("href"))).toEqual([
      "/admin/access/api-keys",
    ]);
    expect(current[0].className).toContain("is-active");
  });

  it("counts comments awaiting reply and links awaiting review, only when there are some", () => {
    state.counts = { comments: 3, friendLinks: 0 };
    renderSideBar();
    const comments = within(nav()).getByRole("link", {
      name: m.admin_sidebar_item_pending({
        label: m.admin_sidebar_comments(),
        pending: m.admin_sidebar_comments_pending({ count: 3 }),
      }),
    });
    expect(comments.querySelector(".admin-sidebar-count")?.textContent).toBe(
      "3",
    );
    const links = within(nav()).getByRole("link", {
      name: m.admin_sidebar_friend_links(),
    });
    expect(links.querySelector(".admin-sidebar-count")).toBeNull();
  });

  it("opens the site in a new tab from its name", () => {
    renderSideBar();
    const site = screen.getByRole("link", {
      name: m.admin_sidebar_site_link({ site: "Blog" }),
    });
    expect(site.getAttribute("href")).toBe("/");
    expect(site.getAttribute("target")).toBe("_blank");
  });

  it("keeps one account row at the foot, whose menu goes back, switches the scheme and signs out", async () => {
    renderSideBar();
    const footer = document.querySelector("footer")!;
    const trigger = within(footer).getByRole("button", {
      name: m.admin_sidebar_account_menu(),
    });
    expect(within(footer).getAllByRole("button")).toEqual([trigger]);
    expect(trigger.textContent).toContain("Admin");
    await act(async () => {
      fireEvent.click(trigger);
    });
    const menu = await screen.findByRole("menu", { hidden: true });
    // Hidden until positioned, which jsdom never measures.
    const items = [...menu.querySelectorAll('[role^="menuitem"]')].map(
      (item) => item.textContent,
    );
    expect(items).toEqual([
      m.admin_layout_back_to_site(),
      m.colour_scheme_light(),
      m.colour_scheme_dark(),
      m.colour_scheme_system(),
      m.admin_sidebar_logout(),
    ]);
    expect(menu.textContent).toContain(m.admin_sidebar_colour_scheme());
  });
});

describe("The current entry", () => {
  it("is the one with the longest prefix of the path", () => {
    expect(currentNavItem("/admin")?.id).toBe("overview");
    expect(currentNavItem("/admin/")?.id).toBe("overview");
    expect(currentNavItem("/admin/posts/edit/3")?.id).toBe("posts");
    expect(currentNavItem("/admin/settings/maintenance")?.id).toBe("settings");
    expect(currentNavItem("/admin/muted-users")?.id).toBe("muted-users");
  });
});
