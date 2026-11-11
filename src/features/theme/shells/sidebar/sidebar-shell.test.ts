// @vitest-environment jsdom
// What only 「侧栏」 does on every page; what every shell must do is in
// ../theme-shells.test.ts, a Post's page and the options in
// ./sidebar-post.test.ts.
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { m } from "@/paraglide/messages";
import { sidebarCardsFor } from "../../components/sidebar-cards";
import {
  banner,
  blockAfter,
  cardSlots,
  declarations,
  flat,
  follows,
  headline,
  inOrder,
  mainNavigation,
  mediaBlocks,
  NAV_OPTIONS,
  onScreen,
  rail,
  railBody,
  railFoot,
  read,
  readCss,
  reducedMotion,
  region,
  renderShell,
  rootProperties,
  shell,
  SITE,
  theme,
  topBar,
} from "./test-utils";

vi.mock("@/components/common/colour-scheme-provider", () => ({
  useColourScheme: () => ({
    colourSchemePreference: "system",
    colourScheme: "light",
    setColourScheme: vi.fn(),
  }),
}));

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

describe("the Theme", () => {
  it("is 「侧栏」, with Posts as tiles, plain meta, the heading accent, a standfirst and the footer as a colophon", () => {
    expect(theme.id).toBe("sidebar");
    expect(theme.name()).toBe(m.theme_sidebar_name());
    expect(theme.recipe).toEqual({
      postCard: "tile",
      meta: "inline",
      noCoverStrip: "remove",
      headingAccent: "on",
      summary: "standfirst",
      archive: "timeline",
      footer: "colophon",
    });
  });

  // The rail shows the identity at some widths only, so the card is the
  // host's to give everywhere and the stylesheet's to hide (below).
  it("names no page whose first screen shows the identity, so the host gives the profile card on every page", () => {
    expect(theme.shell.identityInFirstScreen).toEqual([]);
    for (const pageKind of ["home", "inner", "post"] as const) {
      expect(sidebarCardsFor(pageKind, theme.shell)[0]!.kind).toBe("identity");
    }
  });

  it("shows the tagline on the home page only", () => {
    expect(theme.shell.taglineOn).toEqual(["home"]);
  });
});

describe("the rail", () => {
  it("is the frame of the page: in the body, before the content column", async () => {
    await renderShell({ pageKind: "inner" });

    expect(region("body").contains(rail())).toBe(true);
    expect(rail().parentElement).toBe(region("body"));
    expect(follows(rail(), region("main"))).toBe(true);
    expect(rail().contains(region("main"))).toBe(false);
  });

  it("has, from the top: the brand, who writes here, search and the navigation; at its foot the social links, the account entry and the two switches", async () => {
    await renderShell({ pageKind: "inner" });
    const inRail = within(rail());
    const brand = inRail.getByRole("link", { name: "Engine Notes" });
    const avatar = inRail.getByRole("link", { name: m.profile_avatar_label() });
    const search = inRail.getByRole("link", { name: m.nav_search() });
    const github = inRail.getByRole("link", { name: "GitHub" });
    const account = inRail.getByRole("button", {
      name: m.nav_login_register(),
    });
    const scheme = inRail.getByRole("button", {
      name: m.colour_scheme_toggle_title({ scheme: m.colour_scheme_system() }),
    });
    const language = inRail.getByRole("button", {
      name: m.common_switch_language(),
    });

    expect(
      inOrder([
        brand,
        avatar,
        inRail.getByText("Ada"),
        inRail.getByText("Notes on engines."),
        search,
        mainNavigation(),
        github,
        account,
        scheme,
        language,
      ]),
    ).toBe(true);
    for (const upper of [brand, avatar, search, mainNavigation()]) {
      expect(railBody().contains(upper)).toBe(true);
    }
    for (const lower of [github, account, scheme, language]) {
      expect(railFoot().contains(lower)).toBe(true);
    }
    expect(brand.getAttribute("href")).toBe("/");
    expect(search.getAttribute("href")).toBe("/search");
    expect(avatar.querySelector("img")!.getAttribute("src")).toContain(
      "avatar",
    );
  });

  // The upper part scrolls in a low window; the foot is not in it.
  it("keeps its foot outside the part that scrolls", async () => {
    await renderShell({ pageKind: "inner" });

    expect([...rail().children]).toEqual([railBody(), railFoot()]);
  });

  it("lists every navigation entry in the given order, each led by an icon that is not part of its name", async () => {
    await renderShell({ pageKind: "inner" });
    const links = within(mainNavigation()).getAllByRole("link");

    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      NAV_OPTIONS.map((option) => option.href),
    );
    for (const [index, link] of links.entries()) {
      expect(link.textContent).toBe(NAV_OPTIONS[index]!.label);
      const icon = link.nextElementSibling!;
      expect(icon.getAttribute("aria-hidden")).toBe("true");
      expect(icon.querySelector("svg")).not.toBeNull();
    }
  });

  it("opens an external entry in a new tab, under the mark every navbar gives it", async () => {
    await renderShell({ pageKind: "inner" });

    for (const option of NAV_OPTIONS) {
      const link = within(mainNavigation()).getByRole("link", {
        name: option.label,
      });
      expect(link.getAttribute("target") === "_blank").toBe(option.external);
      expect(link.getAttribute("rel") === "noreferrer").toBe(option.external);
      expect(link.querySelector("svg") !== null).toBe(option.external);
    }
  });

  describe("the current entry", () => {
    const pill = () =>
      mainNavigation().querySelector<HTMLElement>(".sidebar-nav-pill")!;
    const current = () =>
      [...mainNavigation().querySelectorAll(".sidebar-nav-current")].map(
        (link) => link.textContent,
      );
    const row = () =>
      mainNavigation().style.getPropertyValue("--sidebar-current");

    it("is marked by one pill on its row", async () => {
      await renderShell({ pageKind: "inner", path: "/posts" });

      expect(current()).toEqual(["Nav posts"]);
      expect(pill().dataset.shown).toBe("true");
      expect(pill().getAttribute("aria-hidden")).toBe("true");
      expect(row()).toBe("1");
    });

    it("is the Post list on a Post", async () => {
      await renderShell({ pageKind: "post", path: "/post/hello" });

      expect(current()).toEqual(["Nav posts"]);
      expect(row()).toBe("1");
    });

    it("has the pill glide to the next entry, and fade out where it stood on a page that belongs to none", async () => {
      const router = await renderShell({ pageKind: "inner", path: "/moments" });
      expect(row()).toBe("2");

      act(() => router.history.push("/posts"));
      await waitFor(() => expect(current()).toEqual(["Nav posts"]));
      expect(row()).toBe("1");
      expect(pill().dataset.shown).toBe("true");

      act(() => router.history.push("/search"));
      await waitFor(() => expect(current()).toEqual([]));
      expect(row()).toBe("1");
      expect(pill().dataset.shown).toBe("false");
    });
  });

  it("marks search while the search page is open", async () => {
    await renderShell({ pageKind: "inner", path: "/search" });
    const search = within(rail()).getByRole("link", { name: m.nav_search() });

    expect(search.dataset.current).toBe("true");
    cleanup();
    await renderShell({ pageKind: "inner", path: "/posts" });
    expect(
      within(rail()).getByRole("link", { name: m.nav_search() }).dataset
        .current,
    ).toBe("false");
  });

  it("leaves no line for a description or social links the site does not have", async () => {
    await renderShell({
      pageKind: "inner",
      site: { ...SITE, description: "", social: [] },
    });

    expect(rail().querySelector(".sidebar-description")).toBeNull();
    // The hairline over the account entry is the social links' own.
    expect(rail().querySelector(".sidebar-socials")!.childNodes).toHaveLength(
      0,
    );
    expect(readCss("rail.css")).toMatch(
      /\.sidebar-socials:empty\s*\{\s*display: none;\s*\}/,
    );
  });

  it("keeps the avatar over the author's name when it is the brand mark too", async () => {
    await renderShell({
      pageKind: "inner",
      site: { ...SITE, brandMark: "avatar" },
    });
    const inRail = within(rail());

    expect(
      inRail
        .getByRole("link", { name: "Engine Notes" })
        .querySelector("img")!
        .getAttribute("width"),
    ).toBe("28");
    expect(
      inRail
        .getByRole("link", { name: m.profile_avatar_label() })
        .querySelector("img")!
        .getAttribute("width"),
    ).toBe("88");
  });

  describe("the account entry", () => {
    it("offers sign-in to a visitor, in words", async () => {
      await renderShell({ pageKind: "inner" });
      const entry = within(railFoot()).getByRole("button", {
        name: m.nav_login_register(),
      });

      expect(entry.textContent).toBe(m.nav_login_register());
      expect(entry.getAttribute("aria-expanded")).toBe("false");
    });

    it("names a signed-in User beside their picture, and opens the account menu above itself", async () => {
      await renderShell({
        pageKind: "inner",
        user: { name: "Reader", image: "https://example.com/reader.png" },
      });
      const entry = within(railFoot()).getByRole("button", {
        name: m.profile_title(),
      });

      expect(entry.textContent).toBe("Reader");
      expect(entry.querySelector("img")!.getAttribute("src")).toBe(
        "https://example.com/reader.png",
      );
      fireEvent.click(entry);

      const panel = document.getElementById(
        entry.getAttribute("aria-controls")!,
      )!;
      expect(entry.getAttribute("aria-expanded")).toBe("true");
      expect(panel.parentElement).toBe(entry.parentElement);
      expect(railBody().contains(panel)).toBe(false);
      // The account actions alone: the navigation is in the rail already.
      expect(within(panel).queryByRole("navigation")).toBeNull();
      expect(
        within(panel)
          .getByRole("link", { name: m.profile_title() })
          .getAttribute("href"),
      ).toBe("/profile");
      expect(
        within(panel).queryByRole("link", {
          name: m.profile_admin_dashboard_fuwari(),
        }),
      ).toBeNull();
      expect(
        declarations(
          blockAfter(readCss("rail.css"), ".sidebar-account-panel {"),
        ),
      ).toContain("bottom: calc(100% + 8px)");
    });

    it("leads the Admin to the workbench", async () => {
      await renderShell({
        pageKind: "inner",
        user: { name: "Owner", role: "admin" },
      });

      fireEvent.click(
        within(railFoot()).getByRole("button", { name: m.profile_title() }),
      );

      expect(
        screen
          .getByRole("link", { name: m.profile_admin_dashboard_fuwari() })
          .getAttribute("href"),
      ).toBe("/admin");
    });

    it("keeps its place and its name while the session loads", async () => {
      await renderShell({ pageKind: "inner", isSessionLoading: true });
      const entry = within(railFoot()).getByRole("button", {
        name: m.nav_login_register(),
      });

      expect(entry.textContent).toBe("");
      expect(entry.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
    });
  });
});

describe("the top bar", () => {
  it("stands in for the rail with the brand, search and the compact menu, and nothing else", async () => {
    await renderShell({ pageKind: "inner" });
    const inBar = within(topBar());

    expect(follows(topBar(), region("body"))).toBe(true);
    expect(
      inOrder([
        inBar.getByRole("link", { name: "Engine Notes" }),
        inBar.getByRole("link", { name: m.nav_search() }),
        inBar.getByRole("button", { name: m.common_open_menu() }),
      ]),
    ).toBe(true);
    expect(inBar.getAllByRole("link")).toHaveLength(2);
    expect(inBar.getAllByRole("button")).toHaveLength(1);
    expect(inBar.queryByRole("navigation")).toBeNull();
  });

  it("opens the shared compact menu: the navigation, the switches and the account actions", async () => {
    await renderShell({ pageKind: "inner" });
    const trigger = within(topBar()).getByRole("button", {
      name: m.common_open_menu(),
    });

    fireEvent.click(trigger);

    const panel = document.getElementById(
      trigger.getAttribute("aria-controls")!,
    )!;
    expect(topBar().contains(panel)).toBe(true);
    expect(trigger.getAttribute("aria-label")).toBe(m.common_close());
    expect(
      within(
        within(panel).getByRole("navigation", { name: m.nav_main_label() }),
      )
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(NAV_OPTIONS.map((option) => option.label));
    expect(
      within(panel).getByRole("link", { name: m.nav_login_register() }),
    ).toBeTruthy();
    expect(
      within(panel).getByRole("radiogroup", {
        name: m.common_switch_language(),
      }),
    ).toBeTruthy();
  });

  it("shows the same brand mark as the rail", async () => {
    await renderShell({
      pageKind: "inner",
      site: { ...SITE, brandMark: "siteIcon" },
    });
    const marks = [topBar(), rail()].map(
      (place) =>
        within(place)
          .getByRole("link", { name: "Engine Notes" })
          .querySelector("[data-mark]")!.outerHTML,
    );

    expect(marks[0]).toBe(marks[1]);
    expect(marks[0]).toContain('data-mark="siteIcon"');
  });
});

describe("the content column", () => {
  it("is, in order: the headline, the banner, the page, the cards, the footer", async () => {
    await renderShell({ pageKind: "home" });

    expect(
      inOrder([
        headline(),
        banner(),
        region("main"),
        region("sidebar"),
        region("footer"),
      ]),
    ).toBe(true);
    const column = region("main").parentElement!;
    expect([...column.children]).toEqual([
      headline(),
      banner(),
      region("main"),
      region("sidebar"),
      region("footer"),
    ]);
    expect(column.parentElement).toBe(region("body"));
  });

  it("has the floating actions in the body, outside the column", async () => {
    await renderShell({ pageKind: "inner" });
    const floating = screen.getByRole("button", { name: "Floating" });

    expect(floating.parentElement).toBe(region("body"));
  });
});

describe("the banner", () => {
  it("is a band with the image alone, tall on the home page", async () => {
    await renderShell({ pageKind: "home" });

    expect(shell().dataset.home).toBe("true");
    expect(banner()!.children).toHaveLength(1);
    expect(banner()!.firstElementChild).toBe(screen.getByAltText("banner"));
    expect(screen.getByAltText("banner").getAttribute("fetchpriority")).toBe(
      "high",
    );
  });

  it("is the low band on an inner page", async () => {
    await renderShell({ pageKind: "inner" });

    expect(shell().dataset.home).toBe("false");
    expect(banner()).not.toBeNull();
    expect(banner()!.dataset.shown).toBe("true");
    expect(screen.getByAltText("banner").getAttribute("fetchpriority")).toBe(
      "auto",
    );
  });

  it("is not on a focused page, which keeps the rail and the top bar as any page does", async () => {
    await renderShell({ pageKind: "focused" });

    expect(banner()).toBeNull();
    expect(headline()).toBeNull();
    expect(rail()).not.toBeNull();
    expect(topBar()).not.toBeNull();
    expect(
      within(mainNavigation())
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(NAV_OPTIONS.map((option) => option.label));
    expect(region("main").textContent).toContain("Page content");
    expect(region("footer").textContent).toContain("Footer content");
  });

  it("has the same height by page kind at each width, in the stylesheet", () => {
    const css = readCss("sidebar.css");
    const fromLg = blockAfter(
      css.slice(css.indexOf(".sidebar-shell[data-home")),
      "@media (width >= 64rem)",
    );

    expect(declarations(blockAfter(css, ".sidebar-banner {"))).toContain(
      "height: var(--sidebar-banner-h)",
    );
    expect(declarations(blockAfter(css, ".sidebar-shell {"))).toContain(
      "--sidebar-banner-h: 6rem",
    );
    expect(
      declarations(blockAfter(css, '.sidebar-shell[data-home="true"] {')),
    ).toEqual(["--sidebar-banner-h: clamp(12rem, 36svh, 20rem)"]);
    expect(declarations(blockAfter(fromLg, ".sidebar-shell {"))).toEqual([
      "--sidebar-banner-h: 9rem",
    ]);
    expect(
      declarations(blockAfter(fromLg, '.sidebar-shell[data-home="true"] {')),
    ).toEqual(["--sidebar-banner-h: clamp(14rem, 40svh, 28rem)"]);
  });

  it("ends the first screen at its lower edge, and a page without it has none", async () => {
    await renderShell({ pageKind: "home" });
    vi.spyOn(banner()!, "getBoundingClientRect").mockReturnValue({
      bottom: 380,
    } as DOMRect);
    expect(onScreen.firstScreenHeight()).toBe(380);

    // Scrolled, the banner's box has moved up in the window by as much.
    Object.defineProperty(window, "scrollY", { value: 40, configurable: true });
    expect(onScreen.firstScreenHeight()).toBe(420);
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
    cleanup();

    await renderShell({ pageKind: "focused" });
    expect(onScreen.firstScreenHeight()).toBe(0);
  });

  it("folds away on the way to a focused page, with the space after it, and is taken out of the document after", async () => {
    await renderShell({ pageKind: "inner" });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    await onScreen.visit("focused");
    expect(banner()!.dataset.shown).toBe("false");
    expect(banner()!.getAttribute("aria-hidden")).toBe("true");
    expect(
      declarations(
        blockAfter(
          readCss("sidebar.css"),
          '.sidebar-banner[data-shown="false"]',
        ),
      ),
    ).toEqual(["height: 0", "margin-bottom: 0", "opacity: 0"]);

    act(() => {
      vi.advanceTimersByTime(RESIZE_MS + FOLD_SLACK_MS);
    });
    expect(banner()).toBeNull();
  });

  it("resizes at once when the reader goes back or forward", async () => {
    const router = await renderShell({ pageKind: "inner" });
    expect(shell().dataset.instant).toBe("false");

    act(() => router.history.push("/posts"));
    await waitFor(() => expect(router.state.location.pathname).toBe("/posts"));
    expect(shell().dataset.instant).toBe("false");

    act(() => router.history.back());
    await waitFor(() => expect(shell().dataset.instant).toBe("true"));
  });
});

describe("the headline", () => {
  it("is the tagline as the heading of the home page, above the banner", async () => {
    await renderShell({ pageKind: "home" });
    const heading = screen.getByRole("heading", { level: 1 });

    expect(heading.textContent).toBe("Slow and exact");
    expect(headline()!.contains(heading)).toBe(true);
    expect(headline()!.dataset.shown).toBe("true");
    expect(banner()!.contains(heading)).toBe(false);
    expect(follows(heading, banner()!)).toBe(true);
  });

  it("leaves nothing where no tagline is set", async () => {
    await renderShell({ pageKind: "home", site: { ...SITE, tagline: "" } });

    expect(headline()).toBeNull();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(region("main").parentElement!.firstElementChild).toBe(banner());
  });

  it("folds away while the banner gets lower when the home page is left, then is gone", async () => {
    await renderShell({ pageKind: "home" });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    await onScreen.visit("inner");
    expect(headline()!.dataset.shown).toBe("false");
    expect(headline()!.hasAttribute("inert")).toBe(true);
    expect(headline()!.getAttribute("aria-hidden")).toBe("true");

    act(() => {
      vi.advanceTimersByTime(RESIZE_MS + FOLD_SLACK_MS - 1);
    });
    expect(headline()).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(headline()).toBeNull();
  });

  it("unfolds on the way back, from the frames after it was rendered folded", async () => {
    const frames = new Map<number, FrameRequestCallback>();
    let handle = 0;
    vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => {
      frames.set(++handle, frame);
      return handle;
    });
    vi.stubGlobal("cancelAnimationFrame", (cancelled: number) =>
      frames.delete(cancelled),
    );
    /** Everything asked for before this frame runs in it. */
    const nextFrame = () =>
      act(() => {
        const due = [...frames.values()];
        frames.clear();
        for (const frame of due) frame(0);
      });
    await renderShell({ pageKind: "inner" });
    frames.clear();

    await onScreen.visit("home");
    expect(headline()!.dataset.shown).toBe("false");
    expect(headline()!.hasAttribute("inert")).toBe(false);
    nextFrame();
    expect(headline()!.dataset.shown).toBe("false");
    nextFrame();
    expect(headline()!.dataset.shown).toBe("true");
  });

  it("neither folds nor unfolds for a reader who asked for less motion", async () => {
    reducedMotion.matches = true;
    await renderShell({ pageKind: "inner" });

    await onScreen.visit("home");
    expect(headline()!.dataset.shown).toBe("true");
    await onScreen.visit("inner");
    expect(headline()).toBeNull();
  });

  it("takes as long as the stylesheet's own motion of the banner", () => {
    expect(readCss("sidebar.css")).toContain(
      `--sidebar-resize: ${RESIZE_MS}ms;`,
    );
    expect(read("banner.tsx")).toContain(`const RESIZE_MS = ${RESIZE_MS};`);
    expect(read("banner.tsx")).toContain(
      `const FOLD_SLACK_MS = ${FOLD_SLACK_MS};`,
    );
  });
});

describe("the sidebar cards", () => {
  it.each([
    ["home", ["profile", "latest-moments", "categories", "tags"]],
    ["inner", ["profile", "categories", "tags"]],
    ["post", ["profile", "categories", "tags"]],
  ] as const)(
    "all follow the content of a %s page in one group, in the given order",
    async (pageKind, ids) => {
      await renderShell({ pageKind });
      const groups = document.querySelectorAll('[data-shell-region="sidebar"]');

      expect(groups).toHaveLength(1);
      expect(cardSlots().map((slot) => slot.textContent)).toEqual(
        ids.map((id) => `Card ${id}`),
      );
      expect(
        cardSlots().every((slot) => slot.parentElement === groups[0]),
      ).toBe(true);
      expect(inOrder([region("main"), groups[0]!, region("footer")])).toBe(
        true,
      );
      expect(rail().contains(groups[0]!)).toBe(false);
    },
  );

  it("each stand in a slot of their own that says what kind of card it holds", async () => {
    await renderShell({ pageKind: "home" });

    expect(cardSlots().map((slot) => slot.dataset.kind)).toEqual([
      "identity",
      "feed",
      "index",
      "index",
    ]);
    for (const slot of cardSlots()) {
      expect(slot.children).toHaveLength(1);
    }
  });

  it("are in no group on a focused page, nor on a page the host gives no card", async () => {
    await renderShell({ pageKind: "focused" });
    expect(document.querySelector('[data-shell-region="sidebar"]')).toBeNull();
    cleanup();

    await renderShell({ pageKind: "inner", cards: [] });
    expect(document.querySelector('[data-shell-region="sidebar"]')).toBeNull();
  });

  // The rule of ADR 0038: the rail shows the identity from 1024px, so the
  // card may be hidden at exactly those widths and stays in the page.
  describe("the profile card", () => {
    it.each(["home", "inner", "post"] as const)(
      "is in the document of a %s page, first among the cards",
      async (pageKind) => {
        await renderShell({ pageKind });

        expect(cardSlots()[0]!.dataset.kind).toBe("identity");
        expect(cardSlots()[0]!.textContent).toBe("Card profile");
      },
    );

    it("has a rail to stand in for it only from 1024px, and the top bar, which shows no identity, until then", () => {
      const railCss = readCss("rail.css");

      // The rail has no box below 1024px and is a column from there.
      expect(declarations(blockAfter(railCss, ".sidebar-rail {"))).toEqual([
        "display: none",
      ]);
      const railFromLg = mediaBlocks(railCss, "(width >= 64rem)").find(
        (block) => block.includes(".sidebar-rail {"),
      )!;
      expect(declarations(blockAfter(railFromLg, ".sidebar-rail {"))).toContain(
        "display: flex",
      );
      // Its only other rule by width is for a low window, from 1024px too.
      expect(railCss.match(/@media \(width [^)]*\)/g)).toEqual([
        "@media (width >= 64rem)",
        "@media (width >= 64rem)",
      ]);
      const topBarFromLg = mediaBlocks(
        readCss("top-bar.css"),
        "(width >= 64rem)",
      );
      expect(topBarFromLg).toHaveLength(1);
      expect(
        declarations(blockAfter(topBarFromLg[0]!, ".sidebar-topbar {")),
      ).toEqual(["display: none"]);
    });

    it("leaves no gap from 1024px on a page where it is the only card that shows", () => {
      const css = readCss("sidebar.css");
      const fromLg = mediaBlocks(css, "(width >= 64rem)").find((block) =>
        block.includes('.sidebar-card[data-kind="identity"]'),
      )!;

      expect(flat(fromLg)).toContain(
        '.sidebar-cards:not(:has(> .sidebar-card:not(:empty, [data-kind="identity"])))',
      );
    });
  });
});

/** `RESIZE_MS` and `FOLD_SLACK_MS` in banner.tsx. */
const RESIZE_MS = 600;
const FOLD_SLACK_MS = 150;

describe("the stylesheet", () => {
  const shellCss = readCss("sidebar.css");
  const railCss = readCss("rail.css");
  const topBarCss = readCss("top-bar.css");
  const all = [shellCss, railCss, topBarCss].join("\n");

  it("is one file for the Theme to link, with the rail and the top bar in it", () => {
    expect(theme.stylesheet).toMatch(/shells\/sidebar\/sidebar\.css$/);
    expect(shellCss).toContain('@import "./rail.css";');
    expect(shellCss).toContain('@import "./top-bar.css";');
  });

  // The cards take their wide or narrow form from this container; nothing
  // else tells them where they stand.
  it("makes the slot of a card the container its forms follow, and gives it the width of the column", () => {
    const slot = declarations(blockAfter(shellCss, ".sidebar-card {"));

    expect(slot).toContain("container: card / inline-size");
    expect(slot).toContain("flex: 1 1 100%");
    expect(declarations(blockAfter(shellCss, ".sidebar-cards {"))).toContain(
      "flex-wrap: wrap",
    );
  });

  it("leaves no gap for a card that shows nothing, nor for a group of them", () => {
    const rule = shellCss.slice(
      shellCss.indexOf(".sidebar-card:empty"),
      shellCss.indexOf("{", shellCss.indexOf(".sidebar-card:empty")),
    );

    expect(rule.replace(/\s+/g, " ").trim()).toBe(
      ".sidebar-card:empty, .sidebar-cards:not(:has(> .sidebar-card:not(:empty)))",
    );
    expect(declarations(blockAfter(shellCss, ".sidebar-card:empty"))).toEqual([
      "display: none",
    ]);
  });

  it("is one column below 1024px and a row of the rail and the column from there", () => {
    const frame = declarations(blockAfter(shellCss, ".sidebar-frame {"));
    const fromLg = mediaBlocks(shellCss, "(width >= 64rem)").find((block) =>
      block.includes(".sidebar-frame {"),
    )!;

    expect(frame.some((entry) => entry.startsWith("display:"))).toBe(false);
    expect(declarations(blockAfter(fromLg, ".sidebar-frame {"))).toContain(
      "display: flex",
    );
    expect(declarations(blockAfter(shellCss, ".sidebar-content {"))).toContain(
      "flex-direction: column",
    );
  });

  it("keeps the rail in the window, its upper part scrolling by itself and its foot at rest", () => {
    const fromLg = mediaBlocks(railCss, "(width >= 64rem)")[0]!;
    const whole = declarations(blockAfter(fromLg, ".sidebar-rail {"));
    const body = declarations(blockAfter(fromLg, ".sidebar-rail-body {"));
    const foot = declarations(blockAfter(fromLg, ".sidebar-rail-foot {"));

    expect(whole).toEqual(
      expect.arrayContaining([
        "position: sticky",
        "top: 0",
        "flex-direction: column",
        "height: 100dvh",
      ]),
    );
    expect(whole.some((entry) => entry.startsWith("overflow"))).toBe(false);
    expect(body).toEqual(
      expect.arrayContaining([
        "flex: 1 1 auto",
        "min-height: 0",
        "overflow-y: auto",
      ]),
    );
    expect(foot).toContain("flex: none");
    expect(foot.some((entry) => entry.startsWith("overflow"))).toBe(false);
    // Nothing in the upper part gives way: it is the part that scrolls.
    expect(
      declarations(blockAfter(fromLg, ".sidebar-rail-body > * {")),
    ).toEqual(["flex: none"]);
  });

  // 633px of rail above a foot of 121px need a window of 754px; a laptop's
  // is often lower.
  it("draws the rail closer in a window lower than 800px, the pill still on its row", () => {
    const low = mediaBlocks(railCss, "(width >= 64rem) and (height < 50rem)");

    expect(low).toHaveLength(1);
    expect(declarations(blockAfter(low[0]!, ".sidebar-avatar {"))).toEqual(
      expect.arrayContaining(["width: 4rem", "height: 4rem"]),
    );
    expect(declarations(blockAfter(low[0]!, ".sidebar-nav {"))).toEqual([
      "--sidebar-nav-h: 2.5rem",
    ]);
    // The pill and the rows read the same height.
    expect(declarations(blockAfter(railCss, ".sidebar-nav-row {"))).toContain(
      "height: var(--sidebar-nav-h)",
    );
    expect(declarations(blockAfter(railCss, ".sidebar-nav-pill {"))).toEqual(
      expect.arrayContaining([
        "height: var(--sidebar-nav-h)",
        "transform: translateY(calc(var(--sidebar-current, 0) * (var(--sidebar-nav-h) + var(--sidebar-nav-gap))))",
      ]),
    );
    // It comes after the rules it adjusts.
    expect(railCss.indexOf("(height < 50rem)")).toBeGreaterThan(
      railCss.indexOf(".sidebar-nav-pill {"),
    );
  });

  it("stands the footer at the end of the column, at the foot of the window on a short page", () => {
    const column = declarations(blockAfter(shellCss, ".sidebar-content {"));
    const footer = declarations(blockAfter(shellCss, ".sidebar-footer {"));

    expect(column).toContain(
      "min-height: calc(100svh - var(--sidebar-topbar-h))",
    );
    expect(footer).toContain("margin: auto 1.25rem 0");
    expect(
      declarations(blockAfter(topBarCss, ".sidebar-topbar-inner {")),
    ).toContain("height: var(--sidebar-topbar-h)");
  });

  it("floats back to top in the gutter right of the frame, and on screen where there is none", () => {
    const root = rootProperties(shellCss);

    expect(root["--sidebar-frame"]).toBe("81rem");
    expect(root["--shell-floating-actions-left"]).toBe(
      "min(calc(50% + var(--sidebar-frame) / 2 + 0.25rem), calc(100% - 4.75rem))",
    );
    expect(root["--shell-floating-actions-position"]).toBeUndefined();
  });

  it("uses no !important", () => {
    expect(all).not.toContain("!important");
  });

  it("moves nothing for a reader who asked for less motion", () => {
    let still = all;
    for (const head of [
      "@media (hover: hover) and (prefers-reduced-motion: no-preference)",
      "@media (prefers-reduced-motion: no-preference)",
    ]) {
      while (still.includes(head)) {
        still = still.replace(blockAfter(still, head), "");
        still = still.replace(head, "@media motion");
      }
    }

    expect(still).not.toMatch(/transition\s*:/);
    expect(still).not.toMatch(/animation(?:-name)?\s*:/);
    // What is left of motion is where things stand, not how they get there.
    expect(all).toMatch(/transition\s*:/);
  });
});
