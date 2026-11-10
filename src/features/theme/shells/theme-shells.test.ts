// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { createElement } from "react";
import { findInPopover } from "tests/popover";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NavOption, UserInfo } from "@/components/layout/layout-props";
import { resolveSiteConfig } from "@/features/config/config.resolve";
import { m } from "@/paraglide/messages";
import { useFirstScreenHeight } from "../components/first-screen";
import type {
  PageKind,
  SidebarCard,
  ThemeShell,
  ThemeShellProps,
} from "../theme-shell";
import { THEME_SHELLS } from ".";

const calls = vi.hoisted(() => ({
  setColourScheme: vi.fn(),
  setLocale: vi.fn(),
}));
vi.mock("@/components/common/colour-scheme-provider", () => ({
  useColourScheme: () => ({
    colourSchemePreference: "system",
    colourScheme: "light",
    setColourScheme: calls.setColourScheme,
  }),
}));
vi.mock("@/paraglide/runtime", async () => ({
  ...(await vi.importActual("@/paraglide/runtime")),
  setLocale: calls.setLocale,
}));

const NAV_OPTIONS: Array<NavOption> = [
  { id: "home", label: "Nav home", href: "/", external: false },
  { id: "posts", label: "Nav posts", href: "/posts", external: false },
  { id: "custom-0", label: "Nav post", href: "/post/hello", external: false },
  { id: "custom-1", label: "Nav about", href: "/about", external: false },
  {
    id: "custom-2",
    label: "Nav elsewhere",
    href: "https://example.com/",
    external: true,
  },
];

function card(id: string, kind: SidebarCard["kind"]): SidebarCard {
  return { id, kind, content: createElement("div", null, `Card ${id}`) };
}

/** Shaped like the host's list for the home page. */
const CARDS: Array<SidebarCard> = [
  card("profile", "identity"),
  card("latest-moments", "feed"),
  card("categories", "index"),
  card("tags", "index"),
];

function PageContent() {
  const firstScreenHeight = useFirstScreenHeight();
  return createElement(
    "p",
    { "data-first-screen": firstScreenHeight() },
    "Page content",
  );
}

async function renderShell(
  shell: ThemeShell,
  {
    pageKind,
    user,
    logout = vi.fn(async () => {}),
  }: { pageKind: PageKind; user?: UserInfo; logout?: () => Promise<void> },
) {
  const props: ThemeShellProps = {
    pageKind,
    navOptions: NAV_OPTIONS,
    sidebarCards: pageKind === "focused" ? [] : CARDS,
    user,
    isSessionLoading: false,
    logout,
    children: createElement(PageContent),
    footer: createElement("p", null, "Footer content"),
    floatingActions: createElement("button", { type: "button" }, "Floating"),
  };
  const root = createRootRoute({
    beforeLoad: () => ({ siteConfig: resolveSiteConfig({}) }),
    loader: () => ({ currentYear: 2026 }),
    component: () => createElement(shell.Shell, props),
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await act(async () => {
    render(createElement(RouterProvider, { router }));
  });
  await screen.findByText("Page content");
}

function region(name: string) {
  return document.querySelector<HTMLElement>(`[data-shell-region="${name}"]`);
}

function linkCount(label: string) {
  return screen.queryAllByRole("link", { name: label }).length;
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("scrollTo", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe.each(THEME_SHELLS.map((shell) => [shell.id, shell] as const))(
  "the %s shell",
  (id, shell) => {
    it.each(["home", "inner"] as const)(
      "renders everything it is given on a %s page",
      async (pageKind) => {
        await renderShell(shell, { pageKind });

        for (const option of NAV_OPTIONS) {
          const links = screen.getAllByRole("link", { name: option.label });
          expect(links.map((link) => link.getAttribute("href"))).toContain(
            option.href,
          );
        }
        expect(
          screen.getAllByRole("link", { name: m.nav_search() }).length,
        ).toBeGreaterThan(0);

        const sidebar = region("sidebar");
        expect(sidebar).not.toBeNull();
        const shown = CARDS.map(({ id }) =>
          within(sidebar!).getByText(`Card ${id}`),
        );
        // Each card comes after the one before it.
        for (let i = 1; i < shown.length; i++) {
          expect(
            shown[i - 1].compareDocumentPosition(shown[i]) &
              Node.DOCUMENT_POSITION_FOLLOWING,
          ).toBeTruthy();
        }

        expect(screen.getByRole("button", { name: "Floating" })).toBeTruthy();
        expect(
          Number(
            screen.getByText("Page content").getAttribute("data-first-screen"),
          ),
        ).toBeGreaterThanOrEqual(0);
      },
    );

    it("marks its root and regions for shared styles", async () => {
      await renderShell(shell, { pageKind: "inner" });

      expect(
        document.querySelector(`[data-theme-shell="${id}"]`),
      ).not.toBeNull();
      const body = region("body");
      expect(body).not.toBeNull();
      expect(body!.contains(region("sidebar"))).toBe(true);
      expect(body!.contains(region("footer"))).toBe(true);
      expect(region("main")!.textContent).toContain("Page content");
      expect(region("footer")!.textContent).toContain("Footer content");
    });

    it("renders no sidebar on a focused page", async () => {
      await renderShell(shell, { pageKind: "focused" });

      expect(region("sidebar")).toBeNull();
      expect(region("main")!.textContent).toContain("Page content");
      expect(region("footer")!.textContent).toContain("Footer content");
      expect(linkCount("Nav posts")).toBeGreaterThan(0);
    });

    it("switches the colour scheme and the language", async () => {
      await renderShell(shell, { pageKind: "inner" });

      fireEvent.click(
        screen.getAllByRole("button", {
          name: m.colour_scheme_toggle_title({
            scheme: m.colour_scheme_system(),
          }),
        })[0],
      );
      expect(calls.setColourScheme).toHaveBeenCalledWith("light");

      fireEvent.click(
        screen.getAllByRole("button", { name: m.common_switch_language() })[0],
      );
      fireEvent.click(
        await findInPopover("menuitemradio", { name: "English" }),
      );
      expect(calls.setLocale).toHaveBeenCalledWith("en");
    });

    it("opens the compact menu with every navigation entry", async () => {
      await renderShell(shell, { pageKind: "inner" });
      const before = NAV_OPTIONS.map((option) => linkCount(option.label));

      const trigger = screen.getByRole("button", {
        name: m.common_open_menu(),
      });
      fireEvent.click(trigger);

      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      NAV_OPTIONS.forEach((option, index) => {
        expect(linkCount(option.label)).toBe(before[index] + 1);
      });
    });

    it("offers sign-in to a visitor", async () => {
      await renderShell(shell, { pageKind: "inner" });
      expect(
        screen.queryByRole("link", { name: m.nav_login_register() }),
      ).toBeNull();

      fireEvent.click(
        screen.getByRole("button", { name: m.nav_login_register() }),
      );

      expect(
        screen
          .getByRole("link", { name: m.nav_login_register() })
          .getAttribute("href"),
      ).toBe("/login");
    });

    it("lets a signed-in User reach the profile and log out", async () => {
      const logout = vi.fn(async () => {});
      await renderShell(shell, {
        pageKind: "inner",
        user: { name: "Reader", role: "user" },
        logout,
      });

      fireEvent.click(screen.getByRole("button", { name: m.profile_title() }));

      expect(
        screen
          .getByRole("link", { name: m.profile_title() })
          .getAttribute("href"),
      ).toBe("/profile");
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: m.profile_logout_fuwari() }),
        );
      });
      expect(logout).toHaveBeenCalledOnce();
    });
  },
);
