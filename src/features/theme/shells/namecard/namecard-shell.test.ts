// @vitest-environment jsdom
// What only 「名片」 does; what every shell must do is in ../theme-shells.test.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PAGE_FADE_MS } from "@/components/layout/page-fade";
import { resolveSiteConfig } from "@/features/config/config.resolve";
import type { SystemConfig } from "@/features/config/config.schema";
import { m } from "@/paraglide/messages";
import { sidebarCardsFor } from "../../components/sidebar-cards";
import type { PageKind, SidebarCard, ThemeShellProps } from "../../theme-shell";
import { resolveThemeOptions, selectTheme } from "../../themes";
import { DEFAULT_FRAME, FRAMES } from "./frame";

vi.mock("@/components/common/colour-scheme-provider", () => ({
  useColourScheme: () => ({
    colourSchemePreference: "system",
    colourScheme: "light",
    setColourScheme: vi.fn(),
  }),
}));

const theme = selectTheme("namecard");

/** The cards the host gives 「名片」 on a page, each showing only its id. */
function cardsFor(pageKind: PageKind): Array<SidebarCard> {
  return sidebarCardsFor(pageKind, theme.shell).map(({ id, kind }) => ({
    id,
    kind,
    content: createElement("div", null, `Card ${id}`),
  }));
}

const reducedMotion = { matches: false };

async function renderShell({
  pageKind,
  site,
  stored,
  cards = cardsFor(pageKind),
}: {
  pageKind: PageKind;
  site?: SystemConfig["site"];
  stored?: Record<string, unknown>;
  cards?: Array<SidebarCard>;
}) {
  const props: ThemeShellProps = {
    pageKind,
    pageOnScreen: pageKind,
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
}

function shell() {
  return document.querySelector<HTMLElement>('[data-theme-shell="namecard"]')!;
}

function firstScreen() {
  return screen.getByAltText("banner").closest("section")!;
}

function region(name: string) {
  return document.querySelector<HTMLElement>(`[data-shell-region="${name}"]`)!;
}

function follows(earlier: Node, later: Node) {
  return Boolean(
    earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
}

/** Each group of cards: its place, the cards in it and those in the box that stays in view. */
function cardGroups() {
  return [
    ...document.querySelectorAll<HTMLElement>('[data-shell-region="sidebar"]'),
  ].map((group) => ({
    place: group.dataset.place,
    cards: [...group.querySelectorAll(".namecard-card")].map(
      (slot) => slot.textContent,
    ),
    pinned: [
      ...group.querySelectorAll(".namecard-cards-pinned > .namecard-card"),
    ].map((slot) => slot.textContent),
  }));
}

beforeEach(() => {
  reducedMotion.matches = false;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("prefers-reduced-motion") && reducedMotion.matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("scrollTo", vi.fn());
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.unstubAllGlobals();
});

describe("the Theme", () => {
  it("is 「名片」, with Posts as rows, plain meta, an index for the archive and the footer as a signature", () => {
    expect(theme.id).toBe("namecard");
    expect(theme.recipe).toEqual({
      postCard: "row",
      meta: "inline",
      noCoverStrip: "remove",
      headingAccent: "off",
      summary: "standfirst",
      archive: "index",
      footer: "signature",
    });
  });

  it("introduces the author in the first screen of the home page, so the host leaves the profile card out there only", () => {
    expect(theme.shell.identityInFirstScreen).toEqual(["home"]);
    expect(cardsFor("home").map((card) => card.id)).not.toContain("profile");
    for (const pageKind of ["inner", "post"] as const) {
      expect(cardsFor(pageKind).map((card) => card.id)).toContain("profile");
    }
  });
});

describe("the first screen", () => {
  it("greets with the author's name set apart on the home page", async () => {
    await renderShell({
      pageKind: "home",
      site: { author: "Ada", description: "Notes on engines." },
    });

    const greeting = screen.getByRole("heading", { level: 1 });
    expect(greeting.textContent).toBe(
      m.theme_namecard_greeting_hello() +
        m.theme_namecard_greeting_name({ author: "Ada" }),
    );
    expect(greeting.querySelector("em")!.textContent).toBe("Ada");
    expect(screen.getByText("Notes on engines.")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: m.theme_namecard_read_posts() })
        .getAttribute("href"),
    ).toBe("/posts");
    expect(firstScreen().dataset.open).toBe("true");
    expect(firstScreen().hasAttribute("inert")).toBe(false);
  });

  it.each(["inner", "post", "focused"] as const)(
    "is folded on a %s page: no text, out of reach, the banner kept for the way back",
    async (pageKind) => {
      await renderShell({
        pageKind,
        site: { description: "Notes on engines." },
      });

      expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
      expect(screen.queryByText("Notes on engines.")).toBeNull();
      expect(
        screen.queryByRole("link", { name: m.theme_namecard_read_posts() }),
      ).toBeNull();
      expect(firstScreen().dataset.open).toBe("false");
      expect(firstScreen().hasAttribute("inert")).toBe(true);
      expect(firstScreen().getAttribute("aria-hidden")).toBe("true");
    },
  );

  it("sets the avatar on the frame as a seal", async () => {
    await renderShell({ pageKind: "home" });

    const images = [...firstScreen().querySelectorAll("img")];
    expect(images).toHaveLength(2);
    expect(images[1].getAttribute("src")).toContain("avatar");
  });

  it("leaves the seal out when the avatar is the brand mark", async () => {
    await renderShell({ pageKind: "home", site: { brandMark: "avatar" } });

    expect([...firstScreen().querySelectorAll("img")]).toHaveLength(1);
  });
});

describe("the frame shape", () => {
  it("is portrait by default", async () => {
    await renderShell({ pageKind: "home" });

    expect(DEFAULT_FRAME).toBe("portrait");
    expect(shell().dataset.frame).toBe("portrait");
  });

  it.each(FRAMES)("follows the stored option: %s", async (frame) => {
    await renderShell({ pageKind: "home", stored: { frame } });

    expect(shell().dataset.frame).toBe(frame);
  });

  it("falls back to the default for a value it does not know", async () => {
    await renderShell({ pageKind: "home", stored: { frame: "square" } });

    expect(shell().dataset.frame).toBe(DEFAULT_FRAME);
  });

  it("offers the Admin every shape, each with a label", () => {
    const [field] = theme.optionFields!;
    expect(field.key).toBe("frame");
    expect(field.label()).not.toBe("");
    expect(field.choices.map((choice) => choice.value)).toEqual([...FRAMES]);
    for (const choice of field.choices) {
      expect(choice.label()).not.toBe("");
    }
  });

  // The layout under the first screen is the same for every shape
  // (namecard.css says what the right column is as wide as).
  it.each(FRAMES)(
    "places the cards the same whatever the shape: %s",
    async (frame) => {
      await renderShell({ pageKind: "home", stored: { frame } });

      expect(cardGroups().map((group) => group.place)).toEqual(["beside"]);
    },
  );
});

// card-placement.test.ts covers which card goes where; here, what the shell
// makes of it.
describe("the sidebar cards", () => {
  it("stand in one group beside the content on the home page, the ways into the Posts in the box that stays in view", async () => {
    await renderShell({ pageKind: "home" });

    expect(cardGroups()).toEqual([
      {
        place: "beside",
        cards: ["Card latest-moments", "Card categories", "Card tags"],
        pinned: ["Card categories", "Card tags"],
      },
    ]);
  });

  it("do the same on an inner page, the profile card first", async () => {
    await renderShell({ pageKind: "inner" });

    expect(cardGroups()).toEqual([
      {
        place: "beside",
        cards: ["Card profile", "Card categories", "Card tags"],
        pinned: ["Card categories", "Card tags"],
      },
    ]);
  });

  it("all follow the article on a Post's page, where the right column is the table of contents', with no box to keep in view", async () => {
    await renderShell({ pageKind: "post" });

    expect(cardGroups()).toEqual([
      {
        place: "after",
        cards: ["Card profile", "Card categories", "Card tags"],
        pinned: [],
      },
    ]);
  });

  it("are in no group on a focused page", async () => {
    await renderShell({ pageKind: "focused" });

    expect(cardGroups()).toEqual([]);
    expect(region("body").dataset.focused).toBe("true");
  });

  it("have no box to keep in view on a page without a way into the Posts", async () => {
    await renderShell({
      pageKind: "home",
      cards: cardsFor("home").filter((card) => card.kind !== "index"),
    });

    expect(cardGroups()).toEqual([
      { place: "beside", cards: ["Card latest-moments"], pinned: [] },
    ]);
    expect(document.querySelector(".namecard-cards-pinned")).toBeNull();
  });

  it("each stand in a slot of their own that says what kind of card it holds", async () => {
    await renderShell({ pageKind: "home" });

    const slots = [...document.querySelectorAll<HTMLElement>(".namecard-card")];
    expect(slots.map((slot) => [slot.dataset.kind, slot.textContent])).toEqual([
      ["feed", "Card latest-moments"],
      ["index", "Card categories"],
      ["index", "Card tags"],
    ]);
    for (const slot of slots) {
      expect(slot.closest('[data-shell-region="sidebar"]')).not.toBeNull();
    }
  });

  // One column below 1024px, the cards after the content; from there the
  // right column, which a reader comes to after the content too.
  it.each(["home", "inner", "post"] as const)(
    "come after the content and before the footer in the document on a %s page",
    async (pageKind) => {
      await renderShell({ pageKind });

      const groups = [
        ...document.querySelectorAll('[data-shell-region="sidebar"]'),
      ];
      expect(groups.length).toBeGreaterThan(0);
      for (const group of groups) {
        expect(follows(region("main"), group)).toBe(true);
        expect(follows(group, region("footer"))).toBe(true);
      }
    },
  );
});

// During a navigation the address names the next page while `main` still
// holds the one that is left, for as long as the next takes to load. The
// body is laid out for the page `main` holds (the host says which:
// components/public-shell.test.ts).
describe("going from one page to another", () => {
  /** The address names a page of this kind; `main` still holds the last one. */
  let goTo: (pageKind: PageKind) => void;
  /** The page the address names is rendered in `main`. */
  let arrive: () => void;

  async function renderShellOn(pageKind: PageKind) {
    const root = createRootRoute({
      beforeLoad: () => ({ siteConfig: resolveSiteConfig({}) }),
      loader: () => ({ currentYear: 2026 }),
      component: () => {
        const [named, setNamed] = useState(pageKind);
        const [onScreen, setOnScreen] = useState(pageKind);
        goTo = (next) => act(() => setNamed(next));
        arrive = () => act(() => setOnScreen(named));
        return createElement(theme.shell.Shell, {
          pageKind: named,
          pageOnScreen: onScreen,
          options: resolveThemeOptions(theme, undefined),
          navOptions: [],
          sidebarCards: cardsFor(named),
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
  const places = () => cardGroups().map((group) => group.place);

  it("keeps the cards beside the list for as long as it is on screen, and has them after the article in the commit the Post comes in", async () => {
    await renderShellOn("inner");

    goTo("post");
    expect(places()).toEqual(["beside"]);
    // However long the Post takes to load: no timer of the shell's own.
    after(10 * PAGE_FADE_MS);
    expect(places()).toEqual(["beside"]);

    arrive();
    expect(places()).toEqual(["after"]);
  });

  it("keeps the right column free for as long as the Post is on screen, and has the cards there in the commit the list comes in", async () => {
    await renderShellOn("post");

    goTo("home");
    after(10 * PAGE_FADE_MS);
    expect(places()).toEqual(["after"]);

    arrive();
    expect(places()).toEqual(["beside"]);
  });

  it("keeps a focused page alone in its one column until the Post comes in", async () => {
    await renderShellOn("focused");
    expect(region("body").dataset.focused).toBe("true");

    goTo("post");
    expect(region("body").dataset.focused).toBe("true");
    expect(places()).toEqual([]);

    arrive();
    expect(region("body").dataset.focused).toBe("false");
    expect(places()).toEqual(["after"]);
  });

  it("keeps the Post in its column until the focused page comes in", async () => {
    await renderShellOn("post");

    goTo("focused");
    expect(region("body").dataset.focused).toBe("false");

    arrive();
    expect(region("body").dataset.focused).toBe("true");
  });

  it("folds the first screen with the address, as it always has", async () => {
    await renderShellOn("home");
    expect(firstScreen().dataset.open).toBe("true");

    goTo("post");
    expect(firstScreen().dataset.open).toBe("false");
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
  expect(css.indexOf(head), head).toBeGreaterThanOrEqual(0);
  const start = css.indexOf("{", css.indexOf(head));
  let depth = 1;
  let end = start + 1;
  while (depth > 0) {
    if (css[end] === "{") depth += 1;
    if (css[end] === "}") depth -= 1;
    end += 1;
  }
  return css.slice(start + 1, end - 1);
}

/** The value `block` declares for `name`. */
function declared(block: Array<string>, name: string) {
  const declaration = block.find((entry) => entry.startsWith(`${name}:`));
  expect(declaration, name).toBeDefined();
  return declaration!.slice(name.length + 1).trim();
}

/** The custom properties `css` gives the Theme's root, a later block winning. */
function rootProperties(css: string) {
  const properties: Record<string, string> = {};
  for (const [, body] of css.matchAll(
    /:root\[data-theme="namecard"\]\s*\{([^{}]*)\}/g,
  )) {
    for (const declaration of declarations(body!)) {
      const [, name, value] = declaration.match(/^(--[\w-]+):\s*(.+)$/) ?? [];
      if (name) properties[name] = value!;
    }
  }
  return properties;
}

/**
 * What a declared length comes to in px: 1rem is 16px, a percentage is of
 * `basis`, 1vw a hundredth of `window`, and every var() is one of
 * `properties`. It reads calc(), min(), max(), clamp(), brackets and the
 * four operations, and fails on anything else.
 */
function px(
  value: string,
  properties: Record<string, string>,
  { basis = 0, window = 0 }: { basis?: number; window?: number } = {},
) {
  let source = value;
  while (source.includes("var(")) {
    source = source.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
      expect(properties[name], name).toBeDefined();
      return `(${properties[name]})`;
    });
  }
  const tokens =
    source.match(/calc|min|max|clamp|[\d.]+(?:rem|px|vw|%)?|[-+*/(),]/g) ?? [];
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
    if (token === "min" || token === "max" || token === "clamp") {
      const values: Array<number> = [];
      do {
        at += 1;
        values.push(sum());
      } while (tokens[at] === ",");
      at += 1;
      if (token === "clamp") {
        return Math.max(values[0]!, Math.min(values[1]!, values[2]!));
      }
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
    if (token.endsWith("vw")) return (number * window) / 100;
    return token.endsWith("%") ? (number * basis) / 100 : number;
  };
  const length = sum();
  expect(at, value).toBe(tokens.length);
  expect(Number.isFinite(length), value).toBe(true);
  return length;
}

describe("the stylesheet", () => {
  const read = (path: string) =>
    readFileSync(join(import.meta.dirname, path), "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
  // On one line, however a selector is wrapped.
  const css = read("namecard.css").replace(/\s+/g, " ");
  const firstScreenCss = read("first-screen.css").replace(/\s+/g, " ");
  /** From where the page under the first screen is two columns. */
  const SPREAD_FROM = "@media (min-width: 1024px)";
  const SPREAD_FROM_PX = 1024;
  /** The spread's own rules: the block that lays the body out. */
  const BODY = '.namecard-body[data-focused="false"]';
  /** The body of every block of `sheet` under the media query `head`. */
  const under = (sheet: string, head: string) =>
    sheet
      .split(head)
      .slice(1)
      .map((rest) => blockAfter(`@media ${rest}`, "@media"));
  const spread = under(css, SPREAD_FROM).find((block) =>
    block.includes(`${BODY} {`),
  )!;
  /** What holds at every width: the stylesheet without its media queries. */
  const narrow = [...css.matchAll(/@media [^{]+/g)].reduce(
    (sheet, [head]) =>
      under(css, head).reduce((rest, block) => rest.replace(block, ""), sheet),
    css,
  );
  const properties: Record<string, string> = {
    "--fuwari-page-width": read("../../../../styles.css").match(
      /--fuwari-page-width:\s*([^;]+);/,
    )![1]!,
    ...rootProperties(narrow),
  };
  const GUTTER_PX = px(properties["--namecard-gutter"]!, properties);

  /** Where the columns, the side list and back to top stand in a window. */
  function across(width: number) {
    const page = Math.min(width, px(properties["--fuwari-page-width"]!, {}));
    const between = page - 2 * GUTTER_PX;
    const left = (width - page) / 2 + GUTTER_PX;
    const aside = px(properties["--namecard-aside"]!, properties, {
      basis: between,
    });
    const gap = px(properties["--namecard-col-gap"]!, properties, {
      window: width,
    });
    const content = between - gap - aside;
    const listLeft =
      left +
      px(properties["--shell-toc-left"]!, properties, {
        basis: content,
        window: width,
      });
    return {
      aside,
      gap,
      content,
      contentRight: left + content,
      asideLeft: left + content + gap,
      asideRight: left + between,
      listLeft,
      listRight:
        listLeft +
        px(properties["--shell-toc-width"]!, properties, { basis: width }),
      backToTop: px(properties["--shell-floating-actions-left"]!, properties, {
        basis: width,
      }),
    };
  }

  describe("the sidebar cards", () => {
    // The cards take their wide or narrow form from this container; nothing
    // else tells them where they stand.
    it("makes the slot of a card the container its forms follow", () => {
      expect(declarations(blockAfter(css, ".namecard-card {"))).toContain(
        "container: card / inline-size",
      );
    });

    it("leaves no gap for a card that shows nothing, nor for a group of them, nor for an empty box in view", () => {
      const rule = css.slice(
        css.indexOf(".namecard-card:empty"),
        css.indexOf("{", css.indexOf(".namecard-card:empty")),
      );
      expect(rule.trim()).toBe(
        ".namecard-card:empty, .namecard-cards:not(:has(.namecard-card:not(:empty)))",
      );
      expect(declarations(blockAfter(css, ".namecard-card:empty"))).toEqual([
        "display: none",
      ]);
      expect(
        declarations(
          blockAfter(
            spread,
            ".namecard-cards-pinned:not(:has(> .namecard-card:not(:empty))) {",
          ),
        ),
      ).toEqual(["display: none"]);
    });

    it("keeps the ways into the Posts in view below the navbar from 1024px, in a box that scrolls when the window is too low for it", () => {
      const PINNED =
        '.namecard-cards[data-place="beside"] > .namecard-cards-pinned {';
      const box = declarations(blockAfter(spread, PINNED));
      const navbar = px(properties["--namecard-nav-height"]!, properties);
      const top = px(declared(box, "top"), properties);
      const padding = px(declared(box, "padding").split(" ")[0]!, properties);

      expect(box).toContain("position: sticky");
      // The cards in it start under the navbar, clear of it.
      expect(top + padding).toBeGreaterThanOrEqual(navbar + 16);
      // It ends at the foot of the window and scrolls within itself.
      expect(
        px(declared(box, "max-height").replace("100svh", "900px"), properties),
      ).toBe(900 - top);
      expect(box).toContain("overflow-y: auto");
      // Below 1024px it is no box, and nothing is kept in view.
      expect(
        declarations(blockAfter(narrow, ".namecard-cards-pinned {")),
      ).toEqual(["display: contents"]);
      expect(narrow).not.toContain("position: sticky");
    });
  });

  describe("the spread", () => {
    it("is one column below 1024px, with the cards after the content", () => {
      expect(
        declared(
          declarations(blockAfter(narrow, ".namecard-body {")),
          "grid-template-columns",
        ),
      ).toBe("minmax(0, 1fr)");
      // Nothing outside the block from 1024px gives the body a second
      // column or moves a region out of the document's order.
      for (const columns of narrow.match(/grid-template-columns:[^;]+/g)!) {
        expect(columns).toBe("grid-template-columns: minmax(0, 1fr)");
      }
      expect(narrow).not.toMatch(/[\s;{]order\s*:/);
      expect(narrow).not.toMatch(/grid-(area|column|row)\s*:/);
      // And the only widths the layout changes at are these.
      expect(
        [...new Set(css.match(/@media [^{]+/g))].map((head) => head.trim()),
      ).toEqual([
        "@media (max-width: 719px)",
        SPREAD_FROM,
        "@media (prefers-reduced-motion: reduce)",
      ]);
      expect(px(SPREAD_FROM.match(/[\d.]+px/)![0], {})).toBe(SPREAD_FROM_PX);
    });

    it("stands the content left and a column as wide as the portrait frame right of it, from 1024px", () => {
      const body = declarations(blockAfter(spread, `${BODY} {`));

      expect(body).toEqual([
        "grid-template-columns: minmax(0, 1fr) var(--namecard-aside)",
        "column-gap: var(--namecard-col-gap)",
      ]);
      expect(
        declarations(blockAfter(spread, `${BODY} > .namecard-main {`)),
      ).toEqual(["grid-area: 1 / 1"]);
      expect(
        declarations(
          blockAfter(
            spread,
            `${BODY} > .namecard-cards[data-place="beside"] {`,
          ),
        ),
      ).toContain("grid-area: 1 / 2");
      // After the article, in the article's column.
      expect(
        declarations(
          blockAfter(spread, `${BODY} > .namecard-cards[data-place="after"] {`),
        ),
      ).toEqual(["grid-area: 2 / 1"]);
      // The footer closes both columns.
      expect(
        declarations(blockAfter(spread, `${BODY} > .namecard-footer {`)),
      ).toEqual(["grid-column: 1 / -1"]);
    });

    it("leaves a focused page its one column", () => {
      for (const [, selector] of spread.matchAll(/([^{}]+)\{/g)) {
        if (!selector!.includes("namecard-body")) continue;
        expect(selector).toContain('[data-focused="false"]');
      }
    });

    // The first screen and the page under it are one grid: the same room
    // between the columns, and for the portrait frame the same right column.
    it("gives the first screen the columns of the page under it", () => {
      expect(
        declared(
          declarations(
            blockAfter(firstScreenCss, ".namecard-first-screen-inner {"),
          ),
          "column-gap",
        ),
      ).toBe("var(--namecard-col-gap)");
      expect(
        declared(
          declarations(
            blockAfter(firstScreenCss, ".namecard-first-screen-inner {"),
          ),
          "grid-template-columns",
        ),
      ).toBe("minmax(0, 1fr) var(--namecard-art-width)");
      const fromSpread = blockAfter(firstScreenCss, SPREAD_FROM);
      expect(
        declarations(
          blockAfter(fromSpread, '.namecard-shell[data-frame="portrait"] {'),
        ),
      ).toEqual(["--namecard-art-width: var(--namecard-aside)"]);
      // The frame starts at the left edge of that column.
      expect(
        declarations(
          blockAfter(
            fromSpread,
            '.namecard-shell[data-frame="portrait"] .namecard-art {',
          ),
        ),
      ).toContain("justify-self: start");
      // The page and the first screen are as wide, between the same gutters.
      for (const [sheet, block] of [
        [css, ".namecard-body {"],
        [firstScreenCss, ".namecard-first-screen-inner {"],
      ] as const) {
        const box = declarations(blockAfter(sheet, block));
        expect(declared(box, "max-width")).toBe("var(--fuwari-page-width)");
        expect(declared(box, "padding").split(" ")[1]).toBe(
          "var(--namecard-gutter)",
        );
      }
    });

    // A card lies wide from 20rem (the pills, the profile card on its side)
    // and the latest Moments stand two abreast only from 28rem.
    it.each([SPREAD_FROM_PX, 1100, 1280, 1440, 1920, 2560])(
      "has a right column of 20rem to 24rem and a content column that reads well in a window %ipx wide",
      (width) => {
        const { aside, gap, content } = across(width);

        expect(aside).toBeGreaterThanOrEqual(20 * 16);
        expect(aside).toBeLessThanOrEqual(24 * 16);
        expect(gap).toBeGreaterThanOrEqual(40);
        // The article's line: 37 to 45 Chinese characters of the body.
        expect(content).toBeGreaterThanOrEqual(37 * 16);
        expect(content).toBeLessThanOrEqual(45 * 16);
      },
    );

    it("has the pills of a way into the Posts in the right column and in one row after the article", () => {
      const cardCss = read(
        "../../../../components/layout/expandable-sidebar-card.tsx",
      );
      expect(cardCss).toContain("@[34rem]/card:row-start-1");
      for (const width of [SPREAD_FROM_PX, 1440]) {
        expect(across(width).aside).toBeLessThan(34 * 16);
        expect(across(width).content).toBeGreaterThanOrEqual(34 * 16);
      }
    });
  });

  describe("a Post's page", () => {
    it("opens the table of contents from the button until the right column is there for the list, from 1024px", () => {
      expect(properties["--shell-toc-side"]).toBe("none");
      expect(properties["--shell-toc-compact"]).toBe("flex");
      const fromSpread = under(css, SPREAD_FROM).find((block) =>
        block.includes("--shell-toc-side"),
      )!;
      expect(
        declarations(blockAfter(fromSpread, ':root[data-theme="namecard"] {')),
      ).toEqual(["--shell-toc-side: block", "--shell-toc-compact: none"]);
      // Nowhere else: the list shows from 1024px and from no other width.
      expect(css.match(/--shell-toc-side:/g)).toHaveLength(2);
    });

    it("stands the list below the navbar, which stays at the top of the window", () => {
      const navbar = px(properties["--namecard-nav-height"]!, properties);

      expect(
        px(properties["--shell-toc-top"]!, properties),
      ).toBeGreaterThanOrEqual(navbar + 16);
    });

    it.each([SPREAD_FROM_PX, 1100, 1200, 1280, 1366, 1392, 1440, 1920, 2560])(
      "starts the list where the right column does and keeps it in that column, clear of back to top, in a window %ipx wide",
      (width) => {
        const {
          contentRight,
          asideLeft,
          asideRight,
          listLeft,
          listRight,
          backToTop,
          gap,
        } = across(width);

        expect(listLeft).toBeCloseTo(asideLeft);
        expect(listLeft - contentRight).toBeCloseTo(gap);
        expect(listRight).toBeLessThanOrEqual(asideRight);
        // Back to top is 3.75rem wide and stands on the end of the column
        // in a window that has no gutter for it; the list ends 0.75rem
        // short of it at least.
        expect(backToTop - listRight).toBeGreaterThanOrEqual(12);
        expect(listRight - listLeft).toBeGreaterThanOrEqual(15 * 16);
      },
    );
  });

  it("moves nothing of its own for a reader who asked for less motion", () => {
    const reduced = blockAfter(css, "@media (prefers-reduced-motion: reduce)");
    const still = css.replace(reduced, "");
    const moving = [...still.matchAll(/([^{}]+)\{[^{}]*transition\s*:/g)].map(
      ([, selector]) => selector!.trim(),
    );

    expect(moving).toEqual([".namecard-shell"]);
    expect(declarations(blockAfter(reduced, ".namecard-shell {"))).toEqual([
      "transition: none",
    ]);
    expect(still).not.toMatch(/animation(?:-name)?\s*:/);
  });
});
