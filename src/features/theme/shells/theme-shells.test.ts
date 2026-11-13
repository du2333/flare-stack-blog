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
import { createElement, type ReactNode } from "react";
import { findInPopover } from "tests/popover";
import { fixtureTheme } from "tests/theme-fixture/theme";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingActionsProvider } from "@/components/layout/floating-actions";
import type {
  NavLinkOption,
  NavOption,
  UserInfo,
} from "@/components/layout/layout-props";
import { flattenNavOptions, isNavGroup } from "@/components/layout/nav-options";
import { resolveSiteConfig } from "@/features/config/config.resolve";
import type { SystemConfig } from "@/features/config/config.schema";
import TableOfContents from "@/features/posts/components/table-of-contents";
import { m } from "@/paraglide/messages";
import { useFirstScreenHeight } from "../components/first-screen";
import { TocSlotProvider } from "../components/toc-slot";
import type { PageKind, SidebarCard, ThemeShellProps } from "../theme-shell";
import { resolveThemeOptions, THEMES, type Theme } from "../themes";

/** Every registered Theme, and the fixture Theme as a second shell. */
const THEMES_UNDER_TEST = [...THEMES, fixtureTheme];

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
    label: "Nav group",
    children: [
      { id: "custom-2-0", label: "Nav child", href: "/child", external: false },
      {
        id: "custom-2-1",
        label: "Nav child elsewhere",
        href: "https://example.org/",
        external: true,
      },
    ],
  },
  {
    id: "custom-3",
    label: "Nav elsewhere",
    href: "https://example.com/",
    external: true,
  },
];

/** Every link of the navigation, a group's links in its place. */
const NAV_LINKS = flattenNavOptions(NAV_OPTIONS);
const NAV_GROUPS = NAV_OPTIONS.filter(isNavGroup);

function hasLink(scope: HTMLElement, { label, href }: NavLinkOption) {
  return within(scope)
    .queryAllByRole("link", { name: label })
    .some((link) => link.getAttribute("href") === href);
}

/**
 * Each entry of the navigation is reachable in `scope`: a link as a link; a
 * group as its links in its place, or as a button that opens them and is no
 * link itself.
 */
async function expectEveryEntry(scope: HTMLElement) {
  for (const option of NAV_OPTIONS) {
    if (!isNavGroup(option)) {
      expect(hasLink(scope, option)).toBe(true);
      continue;
    }
    expect(
      within(scope).queryByRole("link", { name: option.label }),
    ).toBeNull();
    if (option.children.every((child) => hasLink(scope, child))) continue;
    const trigger = within(scope).getByRole("button", { name: option.label });
    fireEvent.click(trigger);
    const menu = await findInPopover("menu", { name: option.label });
    for (const child of option.children) {
      const item = within(menu).getByRole("menuitem", { name: child.label });
      expect(item.getAttribute("href")).toBe(child.href);
    }
    fireEvent.click(trigger);
  }
}

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

/**
 * The shell as the host renders it, inside the places the host provides
 * for what renders outside the shell's tree (public-shell.tsx).
 */
async function renderShell(
  theme: Theme,
  {
    pageKind,
    user,
    logout = vi.fn(async () => {}),
    site,
    children = createElement(PageContent),
  }: {
    pageKind: PageKind;
    user?: UserInfo;
    logout?: () => Promise<void>;
    site?: SystemConfig["site"];
    /** The page; it must show "Page content". */
    children?: ReactNode;
  },
) {
  const props: ThemeShellProps = {
    pageKind,
    pageOnScreen: pageKind,
    options: resolveThemeOptions(theme, undefined),
    navOptions: NAV_OPTIONS,
    sidebarCards: pageKind === "focused" ? [] : CARDS,
    user,
    isSessionLoading: false,
    logout,
    children,
    footer: createElement("p", null, "Footer content"),
    floatingActions: createElement("button", { type: "button" }, "Floating"),
  };
  const root = createRootRoute({
    beforeLoad: () => ({ siteConfig: resolveSiteConfig({ site }) }),
    loader: () => ({ currentYear: 2026 }),
    component: () =>
      createElement(
        FloatingActionsProvider,
        null,
        createElement(
          TocSlotProvider,
          null,
          createElement(theme.shell.Shell, props),
        ),
      ),
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

/** The link home that carries the site title (not the "Home" navigation entry). */
function brandLink() {
  const { title } = resolveSiteConfig({});
  const link = screen
    .getAllByRole("link", { name: title })
    .find((candidate) => candidate.getAttribute("href") === "/");
  expect(link).toBeDefined();
  return link!;
}

function region(name: string) {
  return document.querySelector<HTMLElement>(`[data-shell-region="${name}"]`);
}

/** The groups a shell stands the sidebar cards in. */
function sidebars() {
  return [
    ...document.querySelectorAll<HTMLElement>('[data-shell-region="sidebar"]'),
  ];
}

function linkCount(label: string) {
  return screen.queryAllByRole("link", { name: label }).length;
}

const HEADINGS = [
  { id: "first", text: "First heading", level: 2 },
  { id: "second", text: "Second heading", level: 2 },
];

/** A Post's page with this table of contents, as post-page.tsx has it. */
function PostPage({ headers }: { headers: typeof HEADINGS }) {
  return createElement(
    "div",
    { className: "relative" },
    createElement(TableOfContents, { headers }),
    createElement(PageContent),
  );
}

/** The shell's slots for the side table of contents. */
function tocSlots() {
  return [...document.querySelectorAll<HTMLElement>("[data-toc-slot]")];
}

/** The side table of contents, wherever it stands. */
function sideList() {
  return document.querySelector('a[href="#first"]')?.closest("nav") ?? null;
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

describe.each(
  THEMES_UNDER_TEST.map((theme) => [theme.shell.id, theme] as const),
)("the %s shell", (id, theme) => {
  it.each(["home", "inner", "post"] as const)(
    "renders everything it is given on a %s page",
    async (pageKind) => {
      await renderShell(theme, { pageKind });

      await expectEveryEntry(document.body);
      expect(
        screen.getAllByRole("link", { name: m.nav_search() }).length,
      ).toBeGreaterThan(0);

      // Every card once, in one of the shell's groups of cards; a group
      // keeps the order the cards were given in.
      const groups = sidebars().map((sidebar) =>
        CARDS.flatMap(({ id }) => within(sidebar).queryAllByText(`Card ${id}`)),
      );
      expect(groups.flat()).toHaveLength(CARDS.length);
      for (const { id } of CARDS) {
        expect(screen.getAllByText(`Card ${id}`)).toHaveLength(1);
      }
      for (const shown of groups) {
        for (let i = 1; i < shown.length; i++) {
          expect(
            shown[i - 1].compareDocumentPosition(shown[i]) &
              Node.DOCUMENT_POSITION_FOLLOWING,
          ).toBeTruthy();
        }
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
    await renderShell(theme, { pageKind: "inner" });

    expect(document.querySelector(`[data-theme-shell="${id}"]`)).not.toBeNull();
    const body = region("body");
    expect(body).not.toBeNull();
    expect(sidebars().length).toBeGreaterThan(0);
    for (const sidebar of sidebars()) {
      expect(body!.contains(sidebar)).toBe(true);
    }
    expect(body!.contains(region("footer"))).toBe(true);
    expect(region("main")!.textContent).toContain("Page content");
    expect(region("footer")!.textContent).toContain("Footer content");
  });

  it("shows the built-in icon and the title by default", async () => {
    await renderShell(theme, { pageKind: "inner" });

    const brand = brandLink();
    expect(brand.querySelector("svg")).not.toBeNull();
    expect(brand.querySelector("img")).toBeNull();
  });

  it("shows the site icon as the brand mark", async () => {
    await renderShell(theme, {
      pageKind: "inner",
      site: { brandMark: "siteIcon" },
    });

    const brand = brandLink();
    expect(brand.querySelector("svg")).toBeNull();
    expect(brand.querySelector("img")?.getAttribute("src")).toBe(
      resolveSiteConfig({}).icons.faviconSvg,
    );
  });

  it("shows the avatar as the brand mark", async () => {
    await renderShell(theme, {
      pageKind: "inner",
      site: { brandMark: "avatar" },
    });

    const brand = brandLink();
    expect(brand.querySelector("svg")).toBeNull();
    expect(brand.querySelector("img")?.getAttribute("src")).toContain("avatar");
  });

  it("shows the title alone when the brand mark is none", async () => {
    await renderShell(theme, {
      pageKind: "inner",
      site: { brandMark: "none" },
    });

    const brand = brandLink();
    expect(brand.querySelector("svg, img")).toBeNull();
    expect(brand.textContent).toBe(resolveSiteConfig({}).title);
  });

  it.each(["home", "inner", "post"] as const)(
    "shows the tagline only where it declares to, on a %s page",
    async (pageKind) => {
      await renderShell(theme, {
        pageKind,
        site: { tagline: "A line under the banner" },
      });

      const shown = screen.queryByText("A line under the banner") !== null;
      expect(shown).toBe(theme.shell.taglineOn?.includes(pageKind) ?? false);
    },
  );

  it("shows no tagline text when none is set", async () => {
    await renderShell(theme, { pageKind: "home" });

    expect(screen.queryByText("A line under the banner")).toBeNull();
  });

  it.each(["home", "inner"] as const)(
    "crops the banner around the focal point on a %s page",
    async (pageKind) => {
      await renderShell(theme, {
        pageKind,
        site: { bannerFocus: { x: 10, y: 80 } },
      });

      const banner = screen.getByAltText("banner");
      expect(banner.style.objectPosition).toBe("10% 80%");
    },
  );

  it("leaves the banner uncropped by a style when the focal point is the centre", async () => {
    await renderShell(theme, { pageKind: "home" });

    expect(screen.getByAltText("banner").style.objectPosition).toBe("");
  });

  // The list renders into the shell's slot where it gives one (TocSlot),
  // and is fixed to the window beside the article where it does not.
  it("gives the side table of contents of a Post at most one slot, in its body, or leaves it beside the article", async () => {
    await renderShell(theme, {
      pageKind: "post",
      children: createElement(PostPage, { headers: HEADINGS }),
    });
    const [slot] = tocSlots();

    expect(tocSlots().length).toBeLessThanOrEqual(1);
    expect(sideList()).not.toBeNull();
    expect(sideList()!.parentElement).toBe(slot ?? document.body);
    if (slot) expect(region("body")!.contains(slot)).toBe(true);
  });

  it("has nothing in a slot on a Post without headings, and no mark of a table of contents", async () => {
    await renderShell(theme, {
      pageKind: "post",
      children: createElement(PostPage, { headers: [] }),
    });

    for (const slot of tocSlots()) {
      expect(slot.childNodes).toHaveLength(0);
    }
    expect(sideList()).toBeNull();
    expect(document.querySelector("[data-table-of-contents]")).toBeNull();
  });

  it("renders no sidebar on a focused page", async () => {
    await renderShell(theme, { pageKind: "focused" });

    expect(sidebars()).toEqual([]);
    expect(region("main")!.textContent).toContain("Page content");
    expect(region("footer")!.textContent).toContain("Footer content");
    expect(linkCount("Nav posts")).toBeGreaterThan(0);
  });

  it("switches the colour scheme and the language", async () => {
    await renderShell(theme, { pageKind: "inner" });

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
    fireEvent.click(await findInPopover("menuitemradio", { name: "English" }));
    expect(calls.setLocale).toHaveBeenCalledWith("en");
  });

  // The band of 「沉浸」 is a second navigation on the page; a name tells
  // the two apart, in every shell.
  it("names its main navigation, in the bar and in the compact menu", async () => {
    await renderShell(theme, { pageKind: "inner" });
    const named = () =>
      screen.getAllByRole("navigation", { name: m.nav_main_label() });

    const inBar = named();
    expect(inBar).toHaveLength(1);
    await expectEveryEntry(inBar[0]);

    fireEvent.click(screen.getByRole("button", { name: m.common_open_menu() }));
    const [, inMenu] = named();
    for (const option of NAV_LINKS) {
      expect(hasLink(inMenu, option)).toBe(true);
    }
  });

  it("opens the compact menu with every navigation link", async () => {
    await renderShell(theme, { pageKind: "inner" });
    const before = NAV_LINKS.map((option) => linkCount(option.label));

    const trigger = screen.getByRole("button", {
      name: m.common_open_menu(),
    });
    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    NAV_LINKS.forEach((option, index) => {
      expect(linkCount(option.label)).toBe(before[index] + 1);
    });
  });

  it("heads a group's links with its name in the compact menu, always open", async () => {
    await renderShell(theme, { pageKind: "inner" });
    fireEvent.click(screen.getByRole("button", { name: m.common_open_menu() }));

    for (const group of NAV_GROUPS) {
      // Only the compact menu shows a group as a heading over its links.
      const shown = screen.getByRole("group", { name: group.label });
      const inMenu = shown.closest("nav")!;
      expect(inMenu.getAttribute("aria-label")).toBe(m.nav_main_label());
      expect(within(shown).getByText(group.label).tagName).not.toBe("A");
      expect(
        within(shown)
          .getAllByRole("link")
          .map((link) => link.textContent),
      ).toEqual(group.children.map((child) => child.label));
      expect(within(inMenu).queryByRole("button", { name: group.label })).toBe(
        null,
      );
    }
  });

  it("offers sign-in to a visitor", async () => {
    await renderShell(theme, { pageKind: "inner" });
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
    await renderShell(theme, {
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
});

// So the tests above see the list in a slot as well as beside the article.
it("has the fixture shell give the side table of contents a slot", async () => {
  await renderShell(fixtureTheme, {
    pageKind: "post",
    children: createElement(PostPage, { headers: HEADINGS }),
  });

  expect(tocSlots()).toHaveLength(1);
  expect(tocSlots()[0]!.contains(sideList())).toBe(true);
});
