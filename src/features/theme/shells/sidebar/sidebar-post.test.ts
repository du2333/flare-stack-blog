// @vitest-environment jsdom
// A Post's page in 「侧栏」, and the Theme's two options; the rest of the shell
// is in ./sidebar-shell.test.ts.
import { cleanup, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { m } from "@/paraglide/messages";
import { resolveThemeOptions } from "../../themes";
import {
  DEFAULT_INNER_BANNER,
  DEFAULT_TOC_PLACE,
  INNER_BANNERS,
  isInnerBanner,
  isTocPlace,
  TOC_PLACES,
} from "./options";
import {
  banner,
  blockAfter,
  cardSlots,
  declarations,
  flat,
  headline,
  inOrder,
  mainNavigation,
  mediaBlocks,
  onScreen,
  rail,
  railBody,
  railFoot,
  readCss,
  reducedMotion,
  region,
  renderShell,
  rootProperties,
  shell,
  theme,
} from "./test-utils";

vi.mock("@/components/common/colour-scheme-provider", () => ({
  useColourScheme: () => ({
    colourSchemePreference: "system",
    colourScheme: "light",
    setColourScheme: vi.fn(),
  }),
}));

/** The rail's slots for the side table of contents. */
function tocSlots() {
  return [...document.querySelectorAll<HTMLElement>("[data-toc-slot]")];
}
/** The side table of contents, wherever it stands. */
function sideList() {
  return document.querySelector('a[href="#first"]')?.closest("nav") ?? null;
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const shellCss = readCss("sidebar.css");
const railCss = readCss("rail.css");
/** The test by which the stylesheet tells a Post whose table of contents is in the rail. */
const TOC_IN_RAIL =
  '.sidebar-shell[data-toc="rail"]:has([data-table-of-contents])';

describe("the options", () => {
  it("are the banner of the inner pages and the place of a Post's table of contents, a low banner and the rail unless the Admin says otherwise", () => {
    expect(INNER_BANNERS).toEqual(["low", "none"]);
    expect(TOC_PLACES).toEqual(["rail", "beside"]);
    expect(DEFAULT_INNER_BANNER).toBe("low");
    expect(DEFAULT_TOC_PLACE).toBe("rail");
    expect(resolveThemeOptions(theme, undefined)).toEqual({
      banner: "low",
      toc: "rail",
    });
  });

  it("read a stored value as it is, and one that is missing or unknown as the default", () => {
    expect(
      resolveThemeOptions(theme, { banner: "none", toc: "beside" }),
    ).toEqual({ banner: "none", toc: "beside" });
    expect(resolveThemeOptions(theme, { toc: "beside" })).toEqual({
      banner: "low",
      toc: "beside",
    });
    expect(
      resolveThemeOptions(theme, { banner: "tall", toc: 3, layout: "D" }),
    ).toEqual({ banner: "low", toc: "rail" });
    expect(isInnerBanner("none")).toBe(true);
    expect(isInnerBanner("tall")).toBe(false);
    expect(isTocPlace("beside")).toBe(true);
    expect(isTocPlace(undefined)).toBe(false);
  });

  it("offer the Admin every value of each, with a label, and say what each option does", () => {
    expect(
      theme.optionFields!.map((field) => ({
        key: field.key,
        label: field.label(),
        hint: field.hint!(),
        choices: field.choices.map((choice) => [choice.value, choice.label()]),
      })),
    ).toEqual([
      {
        key: "banner",
        label: m.theme_sidebar_banner(),
        hint: m.theme_sidebar_banner_hint(),
        choices: [
          ["low", m.theme_sidebar_banner_low()],
          ["none", m.theme_sidebar_banner_none()],
        ],
      },
      {
        key: "toc",
        label: m.theme_sidebar_toc(),
        hint: m.theme_sidebar_toc_hint(),
        choices: [
          ["rail", m.theme_sidebar_toc_rail()],
          ["beside", m.theme_sidebar_toc_beside()],
        ],
      },
    ]);
  });

  it("lay a page out by the default for a stored value the shell does not know", async () => {
    await renderShell({
      pageKind: "inner",
      stored: { banner: "tall", toc: "left" },
    });

    expect(shell().dataset.toc).toBe("rail");
    expect(banner()).not.toBeNull();
    expect(tocSlots()).toHaveLength(1);
  });
});

describe("a Post's page", () => {
  it("has no banner and no headline, the rail as on any page, the cards and the footer after the article", async () => {
    await renderShell({ pageKind: "post" });

    expect(shell().dataset.column).toBe("reading");
    expect(shell().dataset.home).toBe("false");
    expect(banner()).toBeNull();
    expect(headline()).toBeNull();
    expect(screen.queryByAltText("banner")).toBeNull();
    expect(
      within(mainNavigation())
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toHaveLength(5);
    const column = region("main").parentElement!;
    expect([...column.children]).toEqual([
      region("main"),
      region("sidebar"),
      region("footer"),
    ]);
    expect(cardSlots().map((slot) => slot.textContent)).toEqual([
      "Card profile",
      "Card categories",
      "Card tags",
    ]);
  });

  it("is a reading column only from 1024px, for the article, the cards and the footer alike", () => {
    const fromLg = mediaBlocks(shellCss, "(width >= 64rem)").find((block) =>
      block.includes('[data-column="reading"]'),
    )!;
    const column = '.sidebar-shell[data-column="reading"] .sidebar-content {';

    // Nowhere else is the column told to be narrower.
    expect(shellCss.split('[data-column="reading"]')).toHaveLength(
      fromLg.split('[data-column="reading"]').length,
    );
    expect(declarations(blockAfter(fromLg, column))).toEqual([
      "max-width: var(--sidebar-reading-w)",
      "margin-inline: auto",
    ]);
    expect(rootProperties(shellCss)["--sidebar-reading-w"]).toBe("46rem");
    // The column right of the rail at 1024px, of which it is no more: an
    // article is as wide in every window from there.
    expect(64 - 2 - 15 - 1.75).toBeLessThan(46);
    expect(64 - 2 - 15 - 1.75).toBeGreaterThan(45);
  });

  describe("on the way in and out", () => {
    it("takes the layout in the frame the Post is rendered, not when the address names it", async () => {
      await renderShell({ pageKind: "inner" });

      onScreen.goTo("post");
      expect(shell().dataset.column).toBeUndefined();
      expect(banner()).not.toBeNull();
      expect(region("main").textContent).toContain("Page content");

      await onScreen.arrive();
      expect(shell().dataset.column).toBe("reading");
      expect(banner()).toBeNull();
    });

    it("gives the layout back in the frame the next page is rendered", async () => {
      await renderShell({ pageKind: "post" });

      onScreen.goTo("inner");
      expect(shell().dataset.column).toBe("reading");
      expect(banner()).toBeNull();
      expect(document.querySelector("[data-table-of-contents]")).not.toBeNull();

      await onScreen.arrive();
      expect(shell().dataset.column).toBeUndefined();
      expect(banner()).not.toBeNull();
      expect(document.querySelector("[data-table-of-contents]")).toBeNull();
    });

    // The column changes width in the same frame, so nothing folds: it
    // fades with the page that is left, and is gone when the Post shows.
    it("fades the headline and the banner with the page that is left for a Post, and takes them away with it", async () => {
      await renderShell({ pageKind: "home" });
      expect(banner()!.dataset.leaving).toBe("false");

      onScreen.goTo("post");
      expect(banner()!.dataset.leaving).toBe("true");
      expect(headline()!.dataset.leaving).toBe("true");
      expect(banner()!.dataset.shown).toBe("true");
      expect(headline()!.dataset.shown).toBe("true");
      expect(
        declarations(
          blockAfter(
            shellCss,
            '.sidebar-headline[data-leaving="true"],\n.sidebar-banner[data-leaving="true"] {',
          ),
        ),
      ).toEqual(["opacity: 0"]);

      await onScreen.arrive();
      expect(banner()).toBeNull();
      expect(headline()).toBeNull();
    });

    it("does not fade them on the way to any other page", async () => {
      await renderShell({ pageKind: "home" });

      onScreen.goTo("inner");

      expect(banner()!.dataset.leaving).toBe("false");
      expect(headline()!.dataset.leaving).toBe("false");
    });

    it("has them back at their full height in the frame the page after a Post is rendered", async () => {
      await renderShell({ pageKind: "post" });

      await onScreen.visit("home");

      expect(banner()!.dataset.shown).toBe("true");
      expect(banner()!.dataset.leaving).toBe("false");
      expect(headline()!.dataset.shown).toBe("true");
      expect(shell().dataset.home).toBe("true");
    });
  });
});

describe("the table of contents in the rail", () => {
  it("has its place under the navigation, in the part of the rail that scrolls, under a title", async () => {
    await renderShell({ pageKind: "post" });
    const [slot] = tocSlots();
    const place = slot!.parentElement!;

    expect(tocSlots()).toHaveLength(1);
    expect(place.className).toBe("sidebar-rail-toc");
    expect(place.parentElement).toBe(railBody());
    expect(railBody().lastElementChild).toBe(place);
    expect(inOrder([mainNavigation(), place, railFoot()])).toBe(true);
    expect([...place.children]).toEqual([
      within(place).getByText(m.post_toc()),
      slot,
    ]);
    expect(region("body").contains(slot!)).toBe(true);
  });

  it("holds the list of a Post with headings", async () => {
    await renderShell({ pageKind: "post" });

    expect(sideList()).not.toBeNull();
    expect(sideList()!.parentElement).toBe(tocSlots()[0]);
    expect(rail().contains(sideList())).toBe(true);
  });

  it("is empty on a Post without headings, which does not say it has a table of contents", async () => {
    await renderShell({ pageKind: "post", headers: [] });

    expect(tocSlots()[0]!.childNodes).toHaveLength(0);
    expect(document.querySelector("[data-table-of-contents]")).toBeNull();
  });

  // So it is still there while a Post's page fades out.
  it.each(["home", "inner", "focused"] as const)(
    "has its place on a %s page too, empty",
    async (pageKind) => {
      await renderShell({ pageKind });

      expect(tocSlots()).toHaveLength(1);
      expect(tocSlots()[0]!.childNodes).toHaveLength(0);
    },
  );

  it("keeps the list in its place until the Post's page is replaced", async () => {
    await renderShell({ pageKind: "post" });
    const [slot] = tocSlots();

    onScreen.goTo("inner");
    expect(tocSlots()[0]).toBe(slot);
    expect(sideList()!.parentElement).toBe(slot);

    await onScreen.arrive();
    expect(tocSlots()[0]).toBe(slot);
    expect(slot!.childNodes).toHaveLength(0);
  });

  describe("in the stylesheet", () => {
    const place = declarations(blockAfter(railCss, ".sidebar-rail-toc {"));
    const open = declarations(
      blockAfter(railCss, `${TOC_IN_RAIL}\n  .sidebar-rail-toc {`),
    );
    const fold = declarations(blockAfter(railCss, ".sidebar-identity-fold {"));
    const folded = declarations(
      blockAfter(railCss, `${TOC_IN_RAIL}\n  .sidebar-identity-fold {`),
    );

    it("has no height and is out of reach until the page says it has a table of contents", () => {
      expect(place).toEqual(
        expect.arrayContaining([
          "min-height: 0",
          "overflow: hidden",
          "opacity: 0",
          "visibility: hidden",
        ]),
      );
      expect(
        declarations(
          blockAfter(railCss, ".sidebar-rail-body > .sidebar-rail-toc {"),
        ),
      ).toEqual(["flex: 0 1 0px"]);
    });

    it("then takes what the rail has left down to its foot, never under 9rem, and the list scrolls in a slot with a height of its own", () => {
      expect(open).toEqual([
        "flex-grow: 1",
        "min-height: 9rem",
        "opacity: 1",
        "visibility: visible",
      ]);
      expect(
        declarations(blockAfter(railCss, ".sidebar-rail-toc-slot {")),
      ).toEqual(["flex: 1 1 0px", "min-height: 0"]);
      expect(place).toContain("flex-direction: column");
    });

    it("folds who writes here away by the same test, to nothing and out of reach", () => {
      expect(fold).toEqual(["display: grid", "grid-template-rows: 1fr"]);
      expect(folded).toEqual([
        "grid-template-rows: 0fr",
        "opacity: 0",
        "visibility: hidden",
      ]);
      // The room above the avatar is the avatar's own margin, so nothing is
      // left of the row.
      const identity = declarations(blockAfter(railCss, ".sidebar-identity {"));
      expect(identity).toEqual(
        expect.arrayContaining(["min-height: 0", "overflow: hidden"]),
      );
      expect(
        identity.some((entry) => /^padding(-block|-top)?:/.test(entry)),
      ).toBe(false);
      expect(declarations(blockAfter(railCss, ".sidebar-avatar {"))).toContain(
        "margin: 1.5rem 0 1rem",
      );
    });

    it("leaves the entries of the list their own ring, inside the entry", () => {
      expect(flat(railCss)).toContain(
        ".sidebar-shell :is(.sidebar-rail, .sidebar-topbar) :is(a, button):not(.sidebar-rail-toc-slot *):focus-visible",
      );
    });

    it("folds and opens over the same time, and what goes is out of reach only once it has gone", () => {
      const motion = mediaBlocks(
        railCss,
        "(prefers-reduced-motion: no-preference)",
      )[0]!;
      const transitions = (head: string) =>
        declarations(blockAfter(motion, head))
          .find((entry) => entry.startsWith("transition:"))!
          .slice("transition:".length)
          .split(",")
          .map((part) => part.trim());

      expect(rootProperties(shellCss)["--sidebar-fold"]).toBe("520ms");
      expect(transitions(".sidebar-identity-fold {")).toEqual([
        "grid-template-rows var(--sidebar-fold) var(--sidebar-ease)",
        "opacity 320ms ease 160ms",
        "visibility 0s",
      ]);
      expect(
        transitions(`${TOC_IN_RAIL}\n    .sidebar-identity-fold {`),
      ).toEqual([
        "grid-template-rows var(--sidebar-fold) var(--sidebar-ease)",
        "opacity 200ms ease",
        "visibility 0s var(--sidebar-fold)",
      ]);
      expect(transitions(".sidebar-rail-toc {")).toEqual([
        "flex-grow var(--sidebar-fold) var(--sidebar-ease)",
        "min-height var(--sidebar-fold) var(--sidebar-ease)",
        "opacity 200ms ease",
        "visibility 0s var(--sidebar-fold)",
      ]);
      expect(transitions(`${TOC_IN_RAIL}\n    .sidebar-rail-toc {`)).toEqual([
        "flex-grow var(--sidebar-fold) var(--sidebar-ease)",
        "min-height var(--sidebar-fold) var(--sidebar-ease)",
        "opacity 320ms ease 160ms",
        "visibility 0s",
      ]);
    });
  });
});

// The rule of ADR 0038: the card may be hidden only where the shell itself
// shows the identity.
describe("the profile card", () => {
  const identity = '.sidebar-card[data-kind="identity"]';
  const fromLg = mediaBlocks(shellCss, "(width >= 64rem)").find((block) =>
    block.includes(identity),
  )!;

  it("is hidden from 1024px, where the rail shows who writes here, and nowhere else", () => {
    expect(shellCss.split(identity)).toHaveLength(2);
    expect(fromLg).toBeDefined();
    expect(declarations(blockAfter(fromLg, identity))).toEqual([
      "display: none",
    ]);
  });

  it("shows again on a Post whose table of contents has taken that place in the rail", () => {
    const hidden = `.sidebar-shell:not([data-toc="rail"]:has([data-table-of-contents])) ${identity}`;

    expect(flat(fromLg)).toContain(`${hidden},`);
    // The rail folds by the very test the card shows by.
    expect(hidden).toContain(TOC_IN_RAIL.replace(".sidebar-shell", ""));
    expect(railCss).toContain(`${TOC_IN_RAIL}\n  .sidebar-identity-fold {`);
  });

  it("is in the document of a Post with headings and of one without, first among the cards", async () => {
    await renderShell({ pageKind: "post" });
    expect(cardSlots()[0]!.dataset.kind).toBe("identity");
    cleanup();

    await renderShell({ pageKind: "post", headers: [] });
    expect(cardSlots()[0]!.dataset.kind).toBe("identity");
  });
});

describe("what renders outside the shell", () => {
  const fromLg = mediaBlocks(shellCss, "(width >= 64rem)").filter((block) =>
    block.includes("--shell-toc-side"),
  );
  /** What holds below 1024px: the root without what a wider window adds. */
  const root = rootProperties(
    fromLg.reduce((css, block) => css.replace(block, ""), shellCss),
  );

  // One root for both places of the list, so one width for both.
  it("opens the table of contents of a Post from the button below 1024px and shows the list from there, wherever it stands", () => {
    expect(root["--shell-toc-side"]).toBe("none");
    expect(root["--shell-toc-compact"]).toBe("flex");
    expect(fromLg).toHaveLength(1);
    expect(
      declarations(blockAfter(fromLg[0]!, ':root[data-theme="sidebar"] {')),
    ).toEqual(["--shell-toc-side: block", "--shell-toc-compact: none"]);
    // The rail, and with it the slot, is there from the same width.
    expect(mediaBlocks(railCss, "(width >= 64rem)")[0]).toContain(
      ".sidebar-rail {",
    );
  });
});

describe("the option 「内页横幅」 set to none", () => {
  const stored = { banner: "none" };

  it("leaves an inner page without a banner", async () => {
    await renderShell({ pageKind: "inner", stored });

    expect(banner()).toBeNull();
    expect(region("main").parentElement!.firstElementChild).toBe(
      region("main"),
    );
  });

  it("leaves the home page its tall banner and its headline", async () => {
    await renderShell({ pageKind: "home", stored });

    expect(shell().dataset.home).toBe("true");
    expect(banner()!.dataset.shown).toBe("true");
    expect(headline()!.dataset.shown).toBe("true");
  });

  it("changes nothing on a Post's page, which has none either way", async () => {
    await renderShell({ pageKind: "post", stored });
    expect(banner()).toBeNull();
    cleanup();

    await renderShell({ pageKind: "post" });
    expect(banner()).toBeNull();
  });

  it("folds the banner away with the headline on the way from the home page to an inner one", async () => {
    await renderShell({ pageKind: "home", stored });

    await onScreen.visit("inner");

    expect(banner()!.dataset.shown).toBe("false");
    expect(headline()!.dataset.shown).toBe("false");
    expect(shell().dataset.home).toBe("false");
  });

  it("does not ask for the image on a page that shows none", async () => {
    await renderShell({ pageKind: "inner", stored });

    expect(document.querySelector('img[alt="banner"]')).toBeNull();
  });
});

describe("the option 「文章页目录位置」 set beside the article", () => {
  const stored = { toc: "beside" };

  it("gives the list no place in the rail, on any page", async () => {
    for (const pageKind of ["post", "inner", "home"] as const) {
      await renderShell({ pageKind, stored });

      expect(shell().dataset.toc).toBe("beside");
      expect(tocSlots()).toEqual([]);
      expect(rail().querySelector(".sidebar-rail-toc")).toBeNull();
      cleanup();
    }
  });

  it("leaves the list where the shared styles stand it, beside the article", async () => {
    await renderShell({ pageKind: "post", stored });

    expect(sideList()).not.toBeNull();
    expect(sideList()!.parentElement).toBe(document.body);
  });

  // The rail folds, and the profile card shows, only by `data-toc="rail"`.
  it("keeps the rail as on any page, and the profile card hidden where the rail shows", async () => {
    await renderShell({ pageKind: "post", stored });

    expect(document.querySelector("[data-table-of-contents]")).not.toBeNull();
    expect(rail().querySelector(".sidebar-identity")).not.toBeNull();
    for (const rule of railCss.match(/[^{}]*\.sidebar-identity-fold \{/g)!) {
      if (rule.includes(":has(")) expect(rule).toContain('[data-toc="rail"]');
    }
  });

  // The list waits for the first screen to pass; a Post has none, so the
  // list is there from the top of the page as it is in the rail
  // (table-of-contents.test.ts).
  it("shows the list from the top of the page: a Post has no first screen", async () => {
    await renderShell({ pageKind: "post", stored });
    expect(banner()).toBeNull();
    expect(onScreen.firstScreenHeight()).toBe(0);
    cleanup();

    await renderShell({ pageKind: "post" });
    expect(onScreen.firstScreenHeight()).toBe(0);
  });

  describe("in the stylesheet", () => {
    const root = rootProperties(shellCss);
    /** The lane in rem, in a window this many rem wide. */
    const lane = (windowRem: number) =>
      Math.max(10.5, Math.min(windowRem, 81) - 2 - 15 - 1.75 - 46 - 1.5);

    it("stands the list in a lane right of the reading column, 1.5rem clear of it and as wide as the lane", () => {
      expect(root["--shell-toc-top"]).toBe("1.5rem");
      expect(root["--shell-toc-left"]).toBe(
        "calc(100% + var(--sidebar-toc-gap))",
      );
      expect(root["--shell-toc-width"]).toBe("var(--sidebar-toc-lane)");
      expect(root["--sidebar-toc-gap"]).toBe("1.5rem");
    });

    it("makes the lane what the frame has left beside the column, and never under 10.5rem", () => {
      expect(root["--sidebar-rail-w"]).toBe("15rem");
      expect(root["--sidebar-toc-lane"]).toBe(
        "max(10.5rem, calc(min(100vw, var(--sidebar-frame)) - 2rem - var(--sidebar-rail-w) - 1.75rem - var(--sidebar-reading-w) - var(--sidebar-toc-gap)))",
      );
      expect(lane(64)).toBe(10.5);
      expect(lane(81)).toBe(14.75);
      expect(lane(120)).toBe(14.75);
      // What is left for the article at 1024px.
      expect(64 - 2 - 15 - 1.75 - 1.5 - lane(64)).toBe(33.25);
    });

    it("keeps the lane clear down the page of a Post with headings, the column and the lane centred together", () => {
      const fromLg = mediaBlocks(shellCss, "(width >= 64rem)").find((block) =>
        block.includes('[data-toc="beside"]'),
      )!;
      const rule = flat(fromLg).match(
        /\.sidebar-shell\[data-column="reading"\]\[data-toc="beside"\][^{]*\{([^}]*)\}/,
      )!;

      expect(rule[0]).toContain(
        '.sidebar-shell[data-column="reading"][data-toc="beside"]:has([data-table-of-contents]) .sidebar-content {',
      );
      expect(declarations(rule[1]!)).toEqual([
        "max-width: calc(var(--sidebar-reading-w) + var(--sidebar-toc-gap) + var(--sidebar-toc-lane))",
        "padding-right: calc(var(--sidebar-toc-gap) + var(--sidebar-toc-lane))",
      ]);
    });
  });
});
