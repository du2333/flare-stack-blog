// @vitest-environment jsdom
// What only 「沉浸」 does; what every shell must do is in ../theme-shells.test.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
} from "@testing-library/react";
import { createElement } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { resolveSiteConfig } from "@/features/config/config.resolve";
import type { SystemConfig } from "@/features/config/config.schema";
import { m } from "@/paraglide/messages";
import { sidebarCardsFor } from "../../components/sidebar-cards";
import type { PageKind, SidebarCard, ThemeShellProps } from "../../theme-shell";
import { resolveThemeOptions, selectTheme } from "../../themes";

vi.mock("@/components/common/colour-scheme-provider", () => ({
  useColourScheme: () => ({
    colourSchemePreference: "system",
    colourScheme: "light",
    setColourScheme: vi.fn(),
  }),
}));

const theme = selectTheme("immersive");

/** The banner's height, which jsdom cannot lay out; the gauge reports it. */
const BANNER_PX = 700;
/** Where the bar condenses on that banner (`CONDENSE_BEFORE_PX` in navbar.tsx). */
const CONDENSE_AT = BANNER_PX - 168;

const CARDS: Array<SidebarCard> = ["profile", "categories", "tags"].map(
  (id) => ({
    id,
    kind: id === "profile" ? "identity" : "index",
    content: createElement("div", null, `Card ${id}`),
  }),
);

const reducedMotion = { matches: false };
let banner: MockInstance<() => number>;

async function renderShell({
  pageKind,
  site,
}: {
  pageKind: PageKind;
  site?: SystemConfig["site"];
}) {
  const props: ThemeShellProps = {
    pageKind,
    options: resolveThemeOptions(theme, undefined),
    navOptions: [{ id: "home", label: "Nav home", href: "/", external: false }],
    sidebarCards: pageKind === "focused" ? [] : CARDS,
    isSessionLoading: false,
    logout: async () => {},
    children: createElement("p", null, "Page content"),
    footer: createElement("p", null, "Footer content"),
    floatingActions: null,
  };
  const root = createRootRoute({
    beforeLoad: () => ({ siteConfig: resolveSiteConfig({ site }) }),
    loader: () => ({ currentYear: 2026 }),
    component: () => createElement(theme.shell.Shell, props),
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await act(async () => {
    render(createElement(RouterProvider, { router }));
  });
  await screen.findByText("Page content");
  // From here on, time passes only when a test says so.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
}

function shell() {
  return document.querySelector<HTMLElement>('[data-theme-shell="immersive"]')!;
}

function firstScreen() {
  return screen.getByAltText("banner").closest("section")!;
}

function navbar() {
  return screen.getByRole("banner");
}

function region(name: string) {
  return document.querySelector<HTMLElement>(`[data-shell-region="${name}"]`)!;
}

function follows(earlier: Node, later: Node) {
  return Boolean(
    earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
}

function scrollTo(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  act(() => {
    fireEvent.scroll(window);
  });
}

beforeEach(() => {
  reducedMotion.matches = false;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("prefers-reduced-motion") && reducedMotion.matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("scrollTo", vi.fn());
  banner = vi
    .spyOn(HTMLElement.prototype, "offsetHeight", "get")
    .mockReturnValue(BANNER_PX);
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the Theme", () => {
  it("is 「沉浸」, with Posts as tiles, plain meta, no heading accent, a standfirst and the footer as a band, and no options of its own", () => {
    expect(theme.id).toBe("immersive");
    expect(theme.name()).toBe(m.theme_immersive_name());
    expect(theme.recipe).toEqual({
      postCard: "tile",
      meta: "inline",
      noCoverStrip: "remove",
      headingAccent: "off",
      summary: "standfirst",
      archive: "timeline",
      footer: "band",
    });
    expect(theme.optionFields).toBeUndefined();
    expect(resolveThemeOptions(theme, { stale: 1 })).toEqual({});
  });

  it("introduces the author in the first screen of the home page, so the host leaves the profile card out there only", () => {
    expect(theme.shell.identityInFirstScreen).toEqual(["home"]);
    expect(
      sidebarCardsFor("home", theme.shell).map((card) => card.kind),
    ).not.toContain("identity");
    for (const pageKind of ["inner", "post"] as const) {
      expect(sidebarCardsFor(pageKind, theme.shell)[0]!.kind).toBe("identity");
    }
  });
});

describe("the first screen", () => {
  it("introduces the site and its author on the home page", async () => {
    await renderShell({
      pageKind: "home",
      site: {
        title: "Engine Notes",
        author: "Ada",
        description: "Notes on engines.",
        tagline: "Slow and exact",
        social: [{ platform: "github", url: "https://github.com/ada" }],
      },
    });

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Engine Notes",
    );
    expect(screen.getByText("Slow and exact")).toBeTruthy();
    expect(screen.getByText("Notes on engines.")).toBeTruthy();
    const author = screen.getByText("Ada");
    expect(
      author.parentElement!.querySelector("img")!.getAttribute("src"),
    ).toContain("avatar");
    expect(
      screen.getByRole("link", { name: "GitHub" }).getAttribute("href"),
    ).toBe("https://github.com/ada");
    expect(firstScreen().contains(author)).toBe(true);
    expect(shell().dataset.home).toBe("true");
  });

  it("leaves out the lines Site Config has no text for", async () => {
    await renderShell({
      pageKind: "home",
      site: { description: "", tagline: "" },
    });

    expect(firstScreen().querySelectorAll("p")).toHaveLength(0);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it("keeps the avatar beside the author's name when it is the brand mark too", async () => {
    await renderShell({ pageKind: "home", site: { brandMark: "avatar" } });

    const avatars = [...shell().querySelectorAll("img")].filter((image) =>
      image.getAttribute("src")?.includes("avatar"),
    );
    expect(avatars).toHaveLength(2);
    expect(firstScreen().contains(avatars[1]!)).toBe(true);
  });

  it.each(["inner", "post", "focused"] as const)(
    "is a low band without the introduction on a %s page",
    async (pageKind) => {
      await renderShell({
        pageKind,
        site: { description: "Notes on engines." },
      });

      expect(shell().dataset.home).toBe("false");
      expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
      expect(screen.queryByText("Notes on engines.")).toBeNull();
      expect(
        screen.queryByRole("button", {
          name: m.theme_immersive_scroll_down(),
        }),
      ).toBeNull();
      expect(firstScreen().querySelectorAll("img")).toHaveLength(1);
    },
  );

  it("scrolls on from the cue until the content starts under the navbar", async () => {
    await renderShell({ pageKind: "home" });

    fireEvent.click(
      screen.getByRole("button", { name: m.theme_immersive_scroll_down() }),
    );

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: BANNER_PX - 132,
      behavior: "smooth",
    });
  });

  it("jumps there for a reader who asked for less motion", async () => {
    reducedMotion.matches = true;
    await renderShell({ pageKind: "home" });

    fireEvent.click(
      screen.getByRole("button", { name: m.theme_immersive_scroll_down() }),
    );

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: BANNER_PX - 132,
      behavior: "auto",
    });
  });
});

describe("the sidebar cards", () => {
  it.each(["home", "inner", "post"] as const)(
    "follow the content in the document on a %s page",
    async (pageKind) => {
      await renderShell({ pageKind });

      expect(follows(region("main"), region("sidebar"))).toBe(true);
      expect(follows(region("sidebar"), region("footer"))).toBe(true);
      expect(
        [...region("sidebar").children].map((card) => card.textContent),
      ).toEqual(CARDS.map((card) => `Card ${card.id}`));
    },
  );
});

describe("the navbar", () => {
  it("lies on the banner as a bar until the first screen is about to have scrolled past", async () => {
    await renderShell({ pageKind: "home" });
    expect(navbar().dataset.state).toBe("bar");

    scrollTo(CONDENSE_AT);
    expect(navbar().dataset.state).toBe("bar");

    scrollTo(CONDENSE_AT + 1);
    expect(navbar().dataset.state).toBe("pill");
  });

  it("is the pill from the start on a page loaded in its middle", async () => {
    Object.defineProperty(window, "scrollY", { value: 2000 });
    await renderShell({ pageKind: "inner" });

    expect(navbar().dataset.state).toBe("pill");
  });

  it("stays a pill a little above the line on the way back, then is the bar again", async () => {
    await renderShell({ pageKind: "home" });
    scrollTo(CONDENSE_AT + 200);

    scrollTo(CONDENSE_AT - 20);
    expect(navbar().dataset.state).toBe("pill");

    scrollTo(CONDENSE_AT - 40);
    expect(navbar().dataset.state).toBe("bar");
  });

  // After a navigation the router takes the page to the top; on a page with
  // a lower banner the line lies higher than where the page still is.
  it("stays a bar while the page moves up, even above a line it is past", async () => {
    await renderShell({ pageKind: "home" });
    scrollTo(CONDENSE_AT - 100);
    banner.mockReturnValue(BANNER_PX - 300);

    scrollTo(CONDENSE_AT - 120);
    expect(navbar().dataset.state).toBe("bar");

    scrollTo(0);
    vi.advanceTimersByTime(1000);
    expect(navbar().dataset.state).toBe("bar");
  });

  it("condenses once a page that moved up has come to rest past the line", async () => {
    await renderShell({ pageKind: "home" });
    scrollTo(CONDENSE_AT - 100);
    banner.mockReturnValue(BANNER_PX - 300);
    scrollTo(CONDENSE_AT - 120);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(navbar().dataset.state).toBe("pill");
  });

  it("slides away while the page scrolls down and returns on the way up", async () => {
    await renderShell({ pageKind: "home" });

    scrollTo(CONDENSE_AT + 400);
    expect(navbar().dataset.hidden).toBe("true");

    scrollTo(CONDENSE_AT + 380);
    expect(navbar().dataset.hidden).toBe("false");

    scrollTo(CONDENSE_AT + 384);
    expect(navbar().dataset.hidden).toBe("false");

    scrollTo(CONDENSE_AT + 400);
    expect(navbar().dataset.hidden).toBe("true");
  });

  it("stays right behind the first screen, where it has only just condensed", async () => {
    await renderShell({ pageKind: "home" });
    scrollTo(CONDENSE_AT + 20);

    scrollTo(CONDENSE_AT + 100);

    expect(navbar().dataset.hidden).toBe("false");
  });

  it("stays while its menu is open", async () => {
    await renderShell({ pageKind: "home" });
    scrollTo(CONDENSE_AT + 400);
    scrollTo(CONDENSE_AT + 380);
    fireEvent.click(screen.getByRole("button", { name: m.common_open_menu() }));

    scrollTo(CONDENSE_AT + 480);

    expect(navbar().dataset.hidden).toBe("false");
  });

  it("moves between its shapes only after its first frames", async () => {
    const frames: Array<FrameRequestCallback> = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
      frames.push(callback),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    await renderShell({ pageKind: "home" });
    const frame = () => act(() => frames.shift()?.(0));

    expect(navbar().dataset.ready).toBe("false");
    frame();
    expect(navbar().dataset.ready).toBe("false");
    frame();
    expect(navbar().dataset.ready).toBe("true");
  });

  it("names the search field for those who cannot see its label", async () => {
    await renderShell({ pageKind: "home" });

    const search = screen.getByRole("link", { name: m.nav_search() });
    expect(search.getAttribute("href")).toBe("/search");
    expect(search.textContent).toBe(m.nav_search());
  });

  it("says which brand mark it carries, for the pill to fold the title behind one", async () => {
    await renderShell({ pageKind: "home", site: { brandMark: "none" } });

    expect(navbar().dataset.brand).toBe("none");
  });
});

/** The declarations of a block, one per entry, however they are wrapped. */
function declarations(block: string) {
  return block
    .split(";")
    .map((declaration) =>
      declaration
        .replace(/\s+/g, " ")
        .replace(/\( /g, "(")
        .replace(/ \)/g, ")")
        .trim(),
    )
    .filter(Boolean);
}

/** The body of the first block that follows `head` in `css`. */
function blockAfter(css: string, head: string) {
  const start = css.indexOf("{", css.indexOf(head));
  expect(css.indexOf(head), head).toBeGreaterThanOrEqual(0);
  let depth = 1;
  let end = start + 1;
  while (depth > 0) {
    if (css[end] === "{") depth += 1;
    if (css[end] === "}") depth -= 1;
    end += 1;
  }
  return css.slice(start + 1, end - 1);
}

describe("the stylesheet", () => {
  const read = (name: string) =>
    readFileSync(join(import.meta.dirname, name), "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
  const navbarCss = read("navbar.css");
  const all = [read("immersive.css"), navbarCss, read("first-screen.css")].join(
    "\n",
  );

  // The stylesheet reaches the pill on its own before navbar.tsx asks for
  // it, from keyframes that must say what the rule says.
  it.each([
    [
      "immersive-pill",
      '.immersive-nav[data-state="pill"] .immersive-bar',
    ] as const,
    [
      "immersive-pill-fold",
      '.immersive-nav[data-state="pill"]:not([data-brand="none"]) .immersive-bar',
    ] as const,
  ])(
    "draws the same pill from the %s keyframes as from the rule",
    (name, rule) => {
      const keyframes = blockAfter(
        blockAfter(navbarCss, `@keyframes ${name} `),
        "to",
      );

      expect(declarations(keyframes)).toEqual(
        declarations(blockAfter(navbarCss, rule)),
      );
      expect(declarations(keyframes).length).toBeGreaterThan(0);
    },
  );

  it("moves nothing for a reader who asked for less motion", () => {
    let still = all;
    const head = "@media (prefers-reduced-motion: no-preference)";
    while (still.includes(head)) {
      const body = blockAfter(still, head);
      still = still.replace(body, "");
      still = still.replace(head, "@media motion");
    }
    // Hover of the brand mark is asked for together with a pointer.
    still = still.replace(
      blockAfter(
        still,
        "@media (hover: hover) and (prefers-reduced-motion: no-preference)",
      ),
      "",
    );

    expect(still).not.toMatch(/transition\s*:/);
    // What is left picks the navbar's shape from the scroll position: a
    // state tied to the page, which does not play in time.
    const animated = [...still.matchAll(/animation(?:-name)?\s*:\s*([^;]+);/g)];
    expect(animated.map(([, value]) => value!.split(/[\s,]+/)[0])).toEqual([
      "immersive-pill",
      "immersive-scrim-out",
      "immersive-pill",
    ]);
  });
});
