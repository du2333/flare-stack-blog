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
import { createElement, useState } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { PAGE_FADE_MS } from "@/components/layout/page-fade";
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

/** The cards the host gives 「沉浸」 on a page, each showing only its id. */
function cardsFor(pageKind: PageKind): Array<SidebarCard> {
  return sidebarCardsFor(pageKind, theme.shell).map(({ id, kind }) => ({
    id,
    kind,
    content: createElement("div", null, `Card ${id}`),
  }));
}

const reducedMotion = { matches: false };
let banner: MockInstance<() => number>;

async function renderShell({
  pageKind,
  site,
  cards = cardsFor(pageKind),
  stored,
}: {
  pageKind: PageKind;
  site?: SystemConfig["site"];
  cards?: Array<SidebarCard>;
  /** 「沉浸」's options as Site Config holds them. */
  stored?: Record<string, unknown>;
}) {
  const props: ThemeShellProps = {
    pageKind,
    options: resolveThemeOptions(theme, stored),
    navOptions: [{ id: "home", label: "Nav home", href: "/", external: false }],
    sidebarCards: cards,
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
  it("is 「沉浸」, with Posts as tiles, plain meta, no heading accent, a standfirst and the footer as a band", () => {
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

/**
 * The groups of cards in the order of the document: the place each has from
 * 1024px, which side of the content it is on, and the cards in it.
 */
function cardGroups() {
  return [
    ...document.querySelectorAll<HTMLElement>('[data-shell-region="sidebar"]'),
  ].map((group) => {
    expect(follows(group, region("footer"))).toBe(true);
    return {
      place: group.dataset.place,
      side: follows(group, region("main")) ? "before" : "after",
      cards: [...group.children].map((slot) => slot.textContent),
    };
  });
}

describe("the sidebar cards", () => {
  it("lead the home page with the ways into the Posts, the rest after the content", async () => {
    await renderShell({ pageKind: "home" });

    expect(cardGroups()).toEqual([
      {
        place: "before",
        side: "before",
        cards: ["Card categories", "Card tags"],
      },
      { place: "after", side: "after", cards: ["Card latest-moments"] },
    ]);
  });

  it.each(["inner", "post"] as const)(
    "all follow the content on a %s page, the profile card first",
    async (pageKind) => {
      await renderShell({ pageKind });

      expect(cardGroups()).toEqual([
        {
          place: "after",
          side: "after",
          cards: ["Card profile", "Card categories", "Card tags"],
        },
      ]);
    },
  );

  it("are in no group on a focused page", async () => {
    await renderShell({ pageKind: "focused" });

    expect(cardGroups()).toEqual([]);
  });

  it("have no group for a place the page has no card for", async () => {
    await renderShell({
      pageKind: "home",
      cards: cardsFor("home").filter((card) => card.kind === "index"),
    });
    expect(cardGroups().map((group) => group.place)).toEqual(["before"]);
    cleanup();
    vi.useRealTimers();

    await renderShell({
      pageKind: "home",
      cards: cardsFor("home").filter((card) => card.kind !== "index"),
    });
    expect(cardGroups().map((group) => group.place)).toEqual(["after"]);
  });

  it("each stand in a slot of their own that says what kind of card it holds", async () => {
    await renderShell({ pageKind: "home" });

    const slots = [
      ...document.querySelectorAll<HTMLElement>(".immersive-card"),
    ];
    expect(slots.map((slot) => [slot.dataset.kind, slot.textContent])).toEqual([
      ["index", "Card categories"],
      ["index", "Card tags"],
      ["feed", "Card latest-moments"],
    ]);
    for (const slot of slots) {
      expect(slot.parentElement!.dataset.shellRegion).toBe("sidebar");
    }
  });
});

// The option 「卡片位置」: under the list (the default, above) or in a column
// right of the content. card-placement.test.ts covers which card goes where.
describe("the card placement option", () => {
  /** Each group of cards: its place, its side of the content, the cards in it and those in the pinned box. */
  function placedGroups() {
    return [
      ...document.querySelectorAll<HTMLElement>(
        '[data-shell-region="sidebar"]',
      ),
    ].map((group) => {
      expect(follows(group, region("footer"))).toBe(true);
      const text = (slot: Element) => slot.textContent;
      return {
        place: group.dataset.place,
        side: follows(group, region("main")) ? "before" : "after",
        cards: [...group.querySelectorAll(".immersive-card")].map(text),
        pinned: [
          ...group.querySelectorAll(
            ":scope > .immersive-cards-pinned > .immersive-card",
          ),
        ].map(text),
      };
    });
  }

  it("is under the list by default, and whenever the stored value is missing or not a placement", () => {
    expect(resolveThemeOptions(theme, undefined)).toEqual({ cards: "below" });
    expect(resolveThemeOptions(theme, {})).toEqual({ cards: "below" });
    expect(resolveThemeOptions(theme, { cards: "left", stale: 1 })).toEqual({
      cards: "below",
    });
    expect(resolveThemeOptions(theme, { cards: "beside" })).toEqual({
      cards: "beside",
    });
  });

  it("offers the Admin both placements, each with a label, and says what it does", () => {
    expect(theme.optionFields).toHaveLength(1);
    const [field] = theme.optionFields!;
    expect(field.key).toBe("cards");
    expect(field.label()).toBe(m.theme_immersive_cards());
    expect(field.hint?.()).toBe(m.theme_immersive_cards_hint());
    expect(
      field.choices.map((choice) => [choice.value, choice.label()]),
    ).toEqual([
      ["below", m.theme_immersive_cards_below()],
      ["beside", m.theme_immersive_cards_beside()],
    ]);
  });

  it("stands every card of the home page in one group after the content, with no strip before the list", async () => {
    await renderShell({ pageKind: "home", stored: { cards: "beside" } });

    expect(placedGroups()).toEqual([
      {
        place: "beside",
        side: "after",
        cards: ["Card latest-moments", "Card categories", "Card tags"],
        pinned: ["Card categories", "Card tags"],
      },
    ]);
  });

  it("does the same on an inner page, the profile card first", async () => {
    await renderShell({ pageKind: "inner", stored: { cards: "beside" } });

    expect(placedGroups()).toEqual([
      {
        place: "beside",
        side: "after",
        cards: ["Card profile", "Card categories", "Card tags"],
        pinned: ["Card categories", "Card tags"],
      },
    ]);
  });

  it("has no box to pin on a page without a way into the Posts", async () => {
    await renderShell({
      pageKind: "home",
      stored: { cards: "beside" },
      cards: cardsFor("home").filter((card) => card.kind !== "index"),
    });

    expect(placedGroups()).toEqual([
      {
        place: "beside",
        side: "after",
        cards: ["Card latest-moments"],
        pinned: [],
      },
    ]);
    expect(document.querySelector(".immersive-cards-pinned")).toBeNull();
  });

  it("gives every card a slot that says its kind, as under the list", async () => {
    await renderShell({ pageKind: "inner", stored: { cards: "beside" } });

    expect(
      [...document.querySelectorAll<HTMLElement>(".immersive-card")].map(
        (slot) => [slot.dataset.kind, slot.textContent],
      ),
    ).toEqual([
      ["identity", "Card profile"],
      ["index", "Card categories"],
      ["index", "Card tags"],
    ]);
  });

  it("leaves a Post's page as it is under the list", async () => {
    await renderShell({ pageKind: "post", stored: { cards: "beside" } });

    expect(placedGroups()).toEqual([
      {
        place: "after",
        side: "after",
        cards: ["Card profile", "Card categories", "Card tags"],
        pinned: [],
      },
    ]);
  });

  it("has no group on a focused page", async () => {
    await renderShell({ pageKind: "focused", stored: { cards: "beside" } });

    expect(placedGroups()).toEqual([]);
  });

  it("keeps the first screen as it is under the list", async () => {
    const site = { title: "Engine Notes", tagline: "Slow and exact" };
    await renderShell({ pageKind: "home", site });
    const below = firstScreen().outerHTML;
    cleanup();
    vi.useRealTimers();

    await renderShell({ pageKind: "home", site, stored: { cards: "beside" } });

    expect(firstScreen().outerHTML).toBe(below);
  });

  it("lays a page out under the list for a stored value it does not know", async () => {
    await renderShell({ pageKind: "home", stored: { cards: "left" } });

    expect(placedGroups().map((group) => group.place)).toEqual([
      "before",
      "after",
    ]);
  });

  describe("in the stylesheet", () => {
    // Every selector on one line, however the formatter wrapped it.
    const css = readFileSync(join(import.meta.dirname, "immersive.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .replace(/\( /g, "(")
      .replace(/ \)/g, ")");
    const group = '.immersive-cards[data-place="beside"]';
    const column = `.immersive-body:has(> ${group} .immersive-card:not(:empty))`;
    /** What the stylesheet says from 1024px: the block that makes the column. */
    const media = "@media (width >= 64rem)";
    const wide = blockAfter(
      css.slice(css.lastIndexOf(media, css.indexOf(column))),
      media,
    );
    /** What it says at every width. */
    const base = css.replace(wide, "");

    it("follows the content below 1024px as the group after it does, the pinned box no box at all", () => {
      expect(declarations(blockAfter(base, `${group} {`))).toEqual(
        declarations(
          blockAfter(base, '.immersive-cards[data-place="after"] {'),
        ),
      );
      expect(
        declarations(blockAfter(base, ".immersive-cards-pinned {")),
      ).toEqual(["display: contents"]);
      expect(base).not.toContain("position: sticky");
    });

    it("shows the group while a card anywhere in it shows, the pinned ones too", () => {
      const rule = `${group}:has(.immersive-card:not(:empty)) {`;

      expect(declarations(blockAfter(base, rule))).toEqual(["display: flex"]);
      // After the rule that hides a group of empty cards, which it amends.
      expect(base.indexOf(rule)).toBeGreaterThan(
        base.indexOf(".immersive-card:empty"),
      );
    });

    it("makes room for the column only from 1024px and only while a card shows", () => {
      expect(base).not.toContain(column);
      expect(declarations(blockAfter(wide, `${column} {`))).toEqual([
        "display: grid",
        "grid-template-rows: 1fr auto",
        "grid-template-columns: minmax(0, 1fr) 17.5rem",
      ]);
      expect(
        declarations(blockAfter(wide, `${column} > .immersive-main {`)),
      ).toEqual(["grid-area: 1 / 1"]);
      expect(
        declarations(blockAfter(wide, `${column} > .immersive-footer {`)),
      ).toEqual(["grid-area: 2 / 1 / auto / -1"]);
    });

    // 17.5rem is less than the 20rem from which a card takes its wide form.
    it("stands the cards in the column one under the other, each as tall as what it shows", () => {
      expect(declarations(blockAfter(wide, `${group} {`))).toEqual([
        "grid-area: 1 / 2",
        "flex-direction: column",
        "flex-wrap: nowrap",
        "margin-top: 0",
      ]);
      expect(
        declarations(blockAfter(wide, `${group} .immersive-card {`)),
      ).toEqual(["flex: none"]);
    });

    it("keeps the ways into the Posts in view below the navbar, in a box that scrolls when the window is too low for it", () => {
      const pinned = declarations(
        blockAfter(wide, `${group} > .immersive-cards-pinned {`),
      );

      expect(pinned).toEqual(
        expect.arrayContaining([
          "position: sticky",
          "top: 4rem",
          "max-height: calc(100svh - 4rem)",
          "overflow-y: auto",
        ]),
      );
      // The box is larger than its cards by its padding, for their shadows:
      // the first card is 5rem down, clear of the navbar, and the box takes
      // no room in the column. Its padding covers nothing.
      expect(pinned).toContain("padding: 1rem 1rem 2.5rem");
      expect(pinned).toContain("margin: -1rem -1rem -2.5rem");
      expect(pinned).toContain("pointer-events: none");
      expect(
        declarations(
          blockAfter(
            wide,
            `${group} > .immersive-cards-pinned > .immersive-card {`,
          ),
        ),
      ).toEqual(["pointer-events: auto"]);
    });

    it("leaves no gap for a pinned box whose cards show nothing", () => {
      expect(
        declarations(
          blockAfter(
            wide,
            `${group} > .immersive-cards-pinned:not(:has(> .immersive-card:not(:empty))) {`,
          ),
        ),
      ).toEqual(["display: none"]);
    });
  });
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
  const shellCss = read("immersive.css");
  const all = [shellCss, navbarCss, read("first-screen.css")].join("\n");

  // The cards take their wide or narrow form from this container; nothing
  // else tells them where they stand.
  it("makes the slot of a card the container its forms follow", () => {
    expect(declarations(blockAfter(shellCss, ".immersive-card {"))).toContain(
      "container: card / inline-size",
    );
  });

  it("puts the cards placed before the content after it below 1024px, and last", () => {
    const strip = '.immersive-cards[data-place="before"] {';
    const wide = blockAfter(shellCss, "@media (width >= 64rem)");

    expect(declarations(blockAfter(shellCss, strip))).toEqual(["order: 1"]);
    expect(declarations(blockAfter(shellCss, ".immersive-footer {"))).toContain(
      "order: 2",
    );
    expect(shellCss.indexOf(strip)).toBeLessThan(shellCss.indexOf(wide));
    expect(declarations(blockAfter(wide, strip))).toContain("order: 0");
  });

  it("leaves no gap for a card that shows nothing, nor for a group of them", () => {
    const rule = shellCss.slice(
      shellCss.indexOf(".immersive-card:empty"),
      shellCss.indexOf("{", shellCss.indexOf(".immersive-card:empty")),
    );
    expect(rule.replace(/\s+/g, " ").trim()).toBe(
      ".immersive-card:empty, .immersive-cards:not(:has(> .immersive-card:not(:empty)))",
    );
    expect(declarations(blockAfter(shellCss, ".immersive-card:empty"))).toEqual(
      ["display: none"],
    );
  });

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

/** The custom properties `css` gives the Theme's root, a later block winning. */
function rootProperties(css: string) {
  const properties: Record<string, string> = {};
  for (const [, body] of css.matchAll(
    /:root\[data-theme="immersive"\]\s*\{([^{}]*)\}/g,
  )) {
    for (const declaration of declarations(body!)) {
      const [, name, value] = declaration.match(/^(--[\w-]+):\s*(.+)$/) ?? [];
      if (name) properties[name] = value!;
    }
  }
  return properties;
}

/** The value `block` declares for `name`. */
function declared(block: Array<string>, name: string) {
  const declaration = block.find((entry) => entry.startsWith(`${name}:`));
  expect(declaration, name).toBeDefined();
  return declaration!.slice(name.length + 1).trim();
}

/**
 * What a declared length comes to in px: 1rem is 16px, a percentage is of
 * `basis`, and every var() is one of `properties`. It reads calc(), min(),
 * max(), brackets and the four operations, and fails on anything else.
 */
function px(value: string, properties: Record<string, string>, basis = 0) {
  let source = value;
  while (source.includes("var(")) {
    source = source.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
      expect(properties[name], name).toBeDefined();
      return `(${properties[name]})`;
    });
  }
  const tokens = source.match(/calc|min|max|[\d.]+(?:rem|%)?|[-+*/(),]/g) ?? [];
  expect(tokens.join(""), value).toBe(source.replace(/\s+/g, ""));
  let at = 0;
  const sum = (): number => {
    let total = product();
    while (tokens[at] === "+" || tokens[at] === "-") {
      total = tokens[at++] === "+" ? total + product() : total - product();
    }
    return total;
  };
  const product = (): number => {
    let total = term();
    while (tokens[at] === "*" || tokens[at] === "/") {
      total = tokens[at++] === "*" ? total * term() : total / term();
    }
    return total;
  };
  const term = (): number => {
    const token = tokens[at++]!;
    if (token === "min" || token === "max") {
      const values: Array<number> = [];
      do {
        at += 1;
        values.push(sum());
      } while (tokens[at] === ",");
      at += 1;
      return token === "min" ? Math.min(...values) : Math.max(...values);
    }
    if (token === "calc" || token === "(") {
      if (token === "calc") at += 1;
      const inner = sum();
      at += 1;
      return inner;
    }
    const number = Number.parseFloat(token);
    if (token.endsWith("rem")) return number * 16;
    return token.endsWith("%") ? (number * basis) / 100 : number;
  };
  const length = sum();
  expect(at, value).toBe(tokens.length);
  expect(Number.isFinite(length), value).toBe(true);
  return length;
}

describe("a Post's page", () => {
  const read = (path: string) =>
    readFileSync(join(import.meta.dirname, path), "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
  // On one line, however a selector is wrapped.
  const css = read("immersive.css").replace(/\s+/g, " ");
  // From where the gutter right of the reading column has room for the
  // table of contents.
  const BESIDE_FROM = "@media (width >= 80rem)";
  const BESIDE_FROM_PX = 1280;
  const beside = blockAfter(css, BESIDE_FROM);
  const properties: Record<string, string> = {
    "--fuwari-page-width": read("../../../../styles.css").match(
      /--fuwari-page-width:\s*([^;]+);/,
    )![1]!,
    ...rootProperties(css.replace(beside, "")),
  };
  const POST = '.immersive-shell[data-column="reading"]';
  const REGIONS = ".immersive-body > :is(.immersive-main, .immersive-cards)";
  const column = declarations(blockAfter(css, `${POST} ${REGIONS} {`));
  /** How wide the column is in a window: what its margins leave. */
  const columnPx = (width: number) =>
    width - 2 * px(declared(column, "margin-inline"), properties, width);
  const GAP_PX = 16;
  /** Back to top: 3.75rem wide, and 1rem from the edge of the window at least. */
  const BACK_TO_TOP_PX = 60;

  /** Where the column, the side list and back to top stand in a window. */
  function across(width: number) {
    const columnLeft = (width - columnPx(width)) / 2;
    const listLeft =
      columnLeft +
      px(properties["--shell-toc-left"]!, properties, columnPx(width));
    const listWidth = px(properties["--shell-toc-width"]!, properties, width);
    return {
      columnRight: columnLeft + columnPx(width),
      listLeft,
      listWidth,
      listRight: listLeft + listWidth,
      backToTop: px(
        properties["--shell-floating-actions-left"]!,
        properties,
        width,
      ),
    };
  }

  it.each([
    ["home", undefined],
    ["inner", undefined],
    ["post", "reading"],
    ["focused", undefined],
  ] as const)(
    "tells the stylesheet which column a %s page has",
    async (pageKind, column) => {
      await renderShell({ pageKind });

      expect(shell().dataset.column).toBe(column);
    },
  );

  // The page that is left stays on screen while it fades out (PageFade),
  // after the address has changed. The column changes with the page: a
  // moment before the next one shows, when the last has all but gone.
  describe("going from one page to another", () => {
    let goTo: (pageKind: PageKind) => void;

    /** The shell on a page it can leave for another kind of page. */
    async function renderShellOn(pageKind: PageKind) {
      const root = createRootRoute({
        beforeLoad: () => ({ siteConfig: resolveSiteConfig({}) }),
        loader: () => ({ currentYear: 2026 }),
        component: () => {
          const [kind, setKind] = useState(pageKind);
          goTo = (next) => {
            act(() => {
              setKind(next);
            });
          };
          return createElement(theme.shell.Shell, {
            pageKind: kind,
            options: resolveThemeOptions(theme, undefined),
            navOptions: [],
            sidebarCards: cardsFor(kind),
            isSessionLoading: false,
            logout: async () => {},
            children: createElement("p", null, "Page content"),
            footer: null,
            floatingActions: null,
          });
        },
      });
      const router = createRouter({
        routeTree: root,
        history: createMemoryHistory({ initialEntries: ["/"] }),
      });
      await act(async () => {
        render(createElement(RouterProvider, { router }));
      });
      await screen.findByText("Page content");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    }

    function after(ms: number) {
      act(() => {
        vi.advanceTimersByTime(ms);
      });
    }
    /** By when the page that is left is at a few hundredths of its opacity. */
    const ALL_BUT_GONE_MS = PAGE_FADE_MS - 20;

    it("keeps the wide column while the page that is left fades out, and has the reading column when the Post shows", async () => {
      await renderShellOn("inner");

      goTo("post");
      expect(shell().dataset.column).toBeUndefined();
      after(ALL_BUT_GONE_MS);
      expect(shell().dataset.column).toBeUndefined();

      after(PAGE_FADE_MS - ALL_BUT_GONE_MS);
      expect(shell().dataset.column).toBe("reading");
    });

    it("keeps the reading column while the Post that is left fades out, and has the wide one when the next page shows", async () => {
      await renderShellOn("post");

      goTo("home");
      after(ALL_BUT_GONE_MS);
      expect(shell().dataset.column).toBe("reading");

      after(PAGE_FADE_MS - ALL_BUT_GONE_MS);
      expect(shell().dataset.column).toBeUndefined();
    });

    it("leaves the column alone on the way back to a page left a moment ago", async () => {
      await renderShellOn("post");

      goTo("inner");
      after(PAGE_FADE_MS / 2);
      goTo("post");
      after(PAGE_FADE_MS / 2);
      expect(shell().dataset.column).toBe("reading");

      after(PAGE_FADE_MS);
      expect(shell().dataset.column).toBe("reading");
    });

    it("has the next page's column at once for a reader who asked for less motion", async () => {
      reducedMotion.matches = true;
      await renderShellOn("inner");

      goTo("post");
      expect(shell().dataset.column).toBe("reading");

      goTo("inner");
      expect(shell().dataset.column).toBeUndefined();
    });
  });

  it("is one centred reading column, 46rem between its gutters, for the content and the cards after it", () => {
    // Centred as the regions of every page are, by the reading width.
    expect(column).toEqual([
      "margin-inline: max(var(--immersive-gutter), calc(50% - var(--immersive-reading-width) / 2 + var(--immersive-gutter)))",
    ]);
    expect(declarations(blockAfter(css, `} ${REGIONS} {`))).toEqual([
      "margin-inline: max(var(--immersive-gutter), calc(50% - var(--fuwari-page-width) / 2 + var(--immersive-gutter)))",
    ]);

    expect(columnPx(2560)).toBe(46 * 16);
    expect(columnPx(1024)).toBe(46 * 16);
    expect(columnPx(768)).toBe(46 * 16);
    // In a narrower window the column is the window less its gutters.
    expect(columnPx(390)).toBe(390 - 2 * GAP_PX);
  });

  it("narrows nothing else there: the footer keeps the width it has on every page", () => {
    const narrowed = [
      ...css.matchAll(/([^{}]+)\{[^{}]*(?:margin-inline|max-width)\s*:/g),
    ]
      .map(([, selector]) => selector!.replace(/\s+/g, " ").trim())
      .filter((selector) => selector.includes(POST));

    expect(narrowed).toEqual([`${POST} ${REGIONS}`]);
  });

  it("stands the two ways into the Posts side by side in the column, each with its pills under its title", () => {
    const slot = px(
      declared(
        declarations(
          blockAfter(css, `${POST} .immersive-card[data-kind="index"] {`),
        ),
        "flex-basis",
      ),
      properties,
    );
    const half = (columnPx(1440) - GAP_PX) / 2;

    // Two fit in a row; a card has that form from 20rem to 28rem.
    expect(slot).toBeLessThanOrEqual(half);
    expect(half).toBeGreaterThanOrEqual(20 * 16);
    expect(half).toBeLessThan(28 * 16);
  });

  it("opens the table of contents from the button until the gutter has room for the list, from 1280px", () => {
    expect(properties["--shell-toc-side"]).toBe("none");
    expect(properties["--shell-toc-compact"]).toBe("flex");
    expect(
      declarations(blockAfter(beside, ':root[data-theme="immersive"] {')),
    ).toEqual(["--shell-toc-side: block", "--shell-toc-compact: none"]);
    expect(px(BESIDE_FROM.match(/[\d.]+rem/)![0], properties)).toBe(
      BESIDE_FROM_PX,
    );
  });

  it("stands the list below the floating navbar", () => {
    const pill = declarations(
      blockAfter(
        read("navbar.css"),
        '.immersive-nav[data-state="pill"] .immersive-bar {',
      ),
    );
    const pillBottom =
      px(declared(pill, "transform").match(/translateY\((.+)\)/)![1]!, {}) +
      px(declared(pill, "height"), {});

    expect(px(properties["--shell-toc-top"]!, properties)).toBeGreaterThan(
      pillBottom,
    );
  });

  it.each([BESIDE_FROM_PX, 1366, 1440, 1536, 1920, 2560])(
    "keeps the list 1rem from the column and 0.75rem from back to top in a window %ipx wide",
    (width) => {
      const { columnRight, listLeft, listWidth, listRight, backToTop } =
        across(width);

      expect(listLeft - columnRight).toBeCloseTo(16);
      expect(backToTop - listRight).toBeCloseTo(12);
      expect(backToTop + BACK_TO_TOP_PX).toBeLessThanOrEqual(width - GAP_PX);
      expect(listWidth).toBeGreaterThanOrEqual(10 * 16);
    },
  );

  it("gives the list all of the lane up to 14rem, which is what a wide window leaves between the column and back to top", () => {
    expect(across(BESIDE_FROM_PX).listWidth).toBeCloseTo(10.5 * 16);
    expect(across(1392).listWidth).toBeCloseTo(14 * 16);
    expect(across(2560).listWidth).toBeCloseTo(14 * 16);
  });

  // The table of contents and back to top are fixed, and the band is as
  // wide as the window: what lies on what at the end of a Post is a matter
  // of layers. The list and the floating column have z 40 (their classes).
  describe("the band at the end of the page", () => {
    const FLOATING_Z = 40;
    const FOOTER = ".immersive-body > .immersive-footer {";
    const FLOATING = ".immersive-body > .fuwari-floating-actions";
    /** The declarations of every block that follows `head` in `block`. */
    function everyBlockAfter(block: string, head: string) {
      const found: Array<Array<string>> = [];
      for (
        let at = block.indexOf(head);
        at >= 0;
        at = block.indexOf(head, at + 1)
      ) {
        found.push(declarations(blockAfter(block.slice(at), head)));
      }
      return found;
    }
    const z = (block: string, head: string) =>
      Number(declared(declarations(blockAfter(block, head)), "z-index"));
    const fromLg = css
      .split("@media (width >= 64rem)")
      .slice(1)
      .map((rest) => blockAfter(`@media ${rest}`, "@media"))
      .find((block) => block.includes(FOOTER))!;

    it("is over the table of contents and back to top from 1024px, in a body that is no layer itself", () => {
      const body = everyBlockAfter(css, "} .immersive-body {")
        .flat()
        .filter((declaration) => declaration.startsWith("z-index:"));

      expect(body.at(-1)).toBe("z-index: auto");
      expect(z(fromLg, FOOTER)).toBeGreaterThan(FLOATING_Z);
    });

    it("keeps each region of the page a layer over the banner and the navbar's scrim, under the list", () => {
      const regions = z(
        css,
        ".immersive-body > :is(.immersive-main, .immersive-cards, .immersive-footer) {",
      );
      const scrim = z(read("navbar.css"), ".immersive-scrim {");

      expect(regions).toBeGreaterThan(scrim);
      expect(regions).toBeLessThan(FLOATING_Z);
    });

    it("leaves back to top over it from 1392px, where the button stands right of all the band shows", () => {
      const wide = "@media (width >= 87rem)";
      const from = px(wide.match(/[\d.]+rem/)![0], properties);
      const backToTop = (width: number) =>
        px(properties["--shell-floating-actions-left"]!, properties, width);
      const rightOfThePage = (width: number) =>
        width / 2 + px(properties["--fuwari-page-width"]!, properties) / 2;

      expect(z(blockAfter(css, wide), `${FLOATING} {`)).toBeGreaterThan(
        z(fromLg, FOOTER),
      );
      expect(backToTop(from)).toBeGreaterThan(rightOfThePage(from));
      // A pixel narrower, it is against the edge of the window instead, and
      // nearer the page than it stands when it has the room.
      expect(backToTop(from - 1)).toBeLessThan(backToTop(from) - 0.5);
    });

    it("shows a button the keyboard is on over the band", () => {
      expect(z(fromLg, `${FLOATING}:has(:focus-visible) {`)).toBeGreaterThan(
        z(fromLg, FOOTER),
      );
    });

    it("lets the pointer through the room above the band, to the end of the list and to back to top", () => {
      expect(everyBlockAfter(css, "} .immersive-footer {")).toContainEqual([
        "pointer-events: none",
      ]);
      expect(declarations(blockAfter(css, ".immersive-footer > * {"))).toEqual([
        "pointer-events: auto",
      ]);
    });

    it("covers the second button of a Post below 1280px with that room, where the button reaches over the band", () => {
      const narrow = blockAfter(css, "@media (64rem <= width < 80rem)");

      expect(
        declarations(blockAfter(narrow, `${POST} .immersive-footer {`)),
      ).toEqual([
        "background-color: var(--fuwari-page-bg)",
        "pointer-events: auto",
      ]);
    });
  });
});
