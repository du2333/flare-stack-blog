// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { AdminShell } from "./admin-shell";

const state = vi.hoisted(() => ({
  pathname: "/admin/posts",
  counts: { comments: 0, friendLinks: 0 },
  desktop: true,
}));

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
  useRouteContext: () => ({
    siteConfig: { title: "Blog", avatar: "" },
    session: { user: { name: "Admin", image: null } },
  }),
}));
vi.mock("@/features/dashboard/queries", () => ({
  dashboardOverviewQuery: {
    queryKey: ["overview"],
    queryFn: async () => ({ latestDraft: null, recentPosts: [] }),
  },
}));
vi.mock("@/features/auth/queries", () => ({ resetAuthBoundQueries: vi.fn() }));
vi.mock("@/lib/auth/auth-client", () => ({
  getAuthClient: () => ({ signOut: vi.fn() }),
}));
vi.mock("@/components/common/colour-scheme-provider", () => ({
  useColourScheme: () => ({
    colourScheme: "light",
    colourSchemePreference: "system",
    setColourScheme: vi.fn(),
  }),
}));
vi.mock("@/hooks/use-motion", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-motion")>()),
  useMotionPresence: (open: boolean) => open,
  useMediaQuery: () => state.desktop,
}));

beforeEach(() => {
  state.pathname = "/admin/posts";
  state.counts = { comments: 0, friendLinks: 0 };
  state.desktop = true;
  Element.prototype.scrollIntoView = vi.fn();
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: vi.fn(() => ({ cancel: vi.fn() })),
  });
});
afterEach(cleanup);

function renderShell() {
  return render(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(AdminShell, {
        topBar: (open: () => void) =>
          createElement(
            "button",
            { type: "button", onClick: open },
            m.admin_layout_open_navigation(),
          ),
        children: createElement("p", null, "Page"),
      }),
    ),
  );
}

const nav = () => document.querySelector("nav")!;
const drawer = () => document.querySelector<HTMLElement>("#admin-sidebar")!;

describe("The Admin sidebar", () => {
  it("groups the entries by what there is to do", () => {
    renderShell();
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
    renderShell();
    const current = within(nav())
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.getAttribute("href"))).toEqual([
      "/admin/access/api-keys",
    ]);
    expect(current[0].hasAttribute("data-current")).toBe(true);
  });

  it("counts comments awaiting reply and links awaiting review, only when there are some", () => {
    state.counts = { comments: 3, friendLinks: 0 };
    renderShell();
    const comments = within(nav()).getByRole("link", {
      name: m.admin_sidebar_item_pending({
        label: m.admin_sidebar_comments(),
        pending: m.admin_sidebar_comments_pending({ count: 3 }),
      }),
    });
    expect(comments.querySelector(".admin-nav-count")?.textContent).toBe("3");
    const links = within(nav()).getByRole("link", {
      name: m.admin_sidebar_friend_links(),
    });
    expect(links.querySelector(".admin-nav-count")).toBeNull();
  });

  it("opens the site in a new tab from its name, and starts a Post from beside the search", () => {
    renderShell();
    const site = screen.getByRole("link", {
      name: m.admin_sidebar_site_link({ site: "Blog" }),
    });
    expect(site.getAttribute("href")).toBe("/");
    expect(site.getAttribute("target")).toBe("_blank");
    expect(
      screen.getByRole("button", { name: m.admin_posts_create() }),
    ).toBeDefined();
  });

  it("keeps one account row at the foot, whose menu switches the scheme and signs out", async () => {
    renderShell();
    const trigger = screen.getByRole("button", {
      name: m.admin_sidebar_account_menu(),
    });
    expect(trigger.textContent).toContain("Admin");
    await act(async () => {
      fireEvent.click(trigger);
    });
    const menu = await screen.findByRole("menu", { hidden: true });
    expect(
      [...menu.querySelectorAll('[role^="menuitem"]')].map(
        (item) => item.textContent,
      ),
    ).toEqual([
      m.colour_scheme_light(),
      m.colour_scheme_dark(),
      m.colour_scheme_system(),
      m.admin_sidebar_logout(),
    ]);
    expect(menu.textContent).toContain(m.admin_sidebar_colour_scheme());
  });
});

describe("The phone drawer", () => {
  it("opens from the top bar as a dialog that holds focus, and gives it back on Escape", () => {
    state.desktop = false;
    renderShell();
    expect(drawer().getAttribute("data-state")).toBe("closed");
    const menuButton = screen.getByRole("button", {
      name: m.admin_layout_open_navigation(),
    });
    menuButton.focus();
    fireEvent.click(menuButton);
    const panel = drawer();
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("data-state")).toBe("open");
    expect(panel.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(drawer().getAttribute("data-state")).not.toBe("open");
    expect(document.activeElement).toBe(menuButton);
  });

  it("closes on the way to another page", () => {
    state.desktop = false;
    const view = renderShell();
    fireEvent.click(
      screen.getByRole("button", { name: m.admin_layout_open_navigation() }),
    );
    expect(drawer().getAttribute("data-state")).toBe("open");
    state.pathname = "/admin/comments";
    view.rerender(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(AdminShell, {
          topBar: () => null,
          children: null,
        }),
      ),
    );
    expect(drawer().getAttribute("data-state")).not.toBe("open");
  });
});

describe("The command palette", () => {
  it("opens with Ctrl K and with the search, and closes back onto where focus was", () => {
    renderShell();
    const search = screen.getByRole("button", { name: m.admin_shell_search() });
    search.focus();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const dialog = screen.getByRole("dialog", {
      name: m.admin_palette_label(),
    });
    expect(
      within(dialog).getByRole("option", { name: m.admin_posts_create() }),
    ).toBeDefined();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(search);

    fireEvent.click(search);
    expect(
      screen.getByRole("dialog", { name: m.admin_palette_label() }),
    ).toBeDefined();
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
