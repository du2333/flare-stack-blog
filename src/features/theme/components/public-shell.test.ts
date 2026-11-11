// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement, useLayoutEffect, useRef } from "react";
import { fixtureTheme } from "tests/theme-fixture/theme";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PAGE_FADE_MS } from "@/components/layout/page-fade";
import { resolveSiteConfig } from "@/features/config/config.resolve";
import { m } from "@/paraglide/messages";
import { DEFAULT_THEME_RECIPE, type ThemeRecipe } from "../theme-recipe";
import type { PageKind, ThemeShellProps } from "../theme-shell";
import type { Theme } from "../themes";
import { PublicShell } from "./public-shell";
import { useThemeRecipe } from "./theme-recipe";
import { TocSlot, useTocSlot } from "./toc-slot";

const reducedMotion = { matches: false };

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

/** Content that shows the recipe it is given. */
function RecipeReader() {
  return createElement("p", null, `recipe ${useThemeRecipe().postCard}`);
}

it("renders the selected Theme's shell with its options and gives the content its recipe", async () => {
  const received: Array<ThemeShellProps> = [];
  const theme: Theme = {
    ...fixtureTheme,
    recipe: { ...DEFAULT_THEME_RECIPE, postCard: "row" },
    shell: {
      ...fixtureTheme.shell,
      Shell: (props) => {
        received.push(props);
        return createElement("div", null, props.children);
      },
    },
  };
  const root = createRootRoute({
    beforeLoad: () => ({ siteConfig: resolveSiteConfig({}) }),
    loader: () => ({ currentYear: 2026 }),
    component: () =>
      createElement(PublicShell, {
        theme,
        options: { marker: "off" },
        navOptions: [],
        isSessionLoading: false,
        logout: async () => {},
        children: createElement(RecipeReader),
      }),
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/profile"] }),
  });
  await act(async () => {
    render(createElement(RouterProvider, { router }));
  });

  expect(await screen.findByText("recipe row")).toBeTruthy();
  expect(received.at(-1)).toMatchObject({
    pageKind: "focused",
    options: { marker: "off" },
    sidebarCards: [],
  });
});

it.each([
  ["caption", false],
  ["band", true],
] as const)(
  "gives the shell the footer in the form the recipe picks: %s",
  async (footer: ThemeRecipe["footer"], band) => {
    const theme: Theme = {
      ...fixtureTheme,
      recipe: { ...DEFAULT_THEME_RECIPE, footer },
      shell: {
        ...fixtureTheme.shell,
        Shell: (props) =>
          createElement("div", { "data-testid": "footer" }, props.footer),
      },
    };
    const root = createRootRoute({
      beforeLoad: () => ({ siteConfig: resolveSiteConfig({}) }),
      loader: () => ({ currentYear: 2026 }),
      component: () =>
        createElement(PublicShell, {
          theme,
          options: {},
          navOptions: [
            { id: "home", label: "Nav home", href: "/", external: false },
          ],
          isSessionLoading: false,
          logout: async () => {},
          children: null,
        }),
    });
    const router = createRouter({
      routeTree: root,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    await act(async () => {
      render(createElement(RouterProvider, { router }));
    });

    const region = await screen.findByTestId("footer");
    const link = (href: string) => region.querySelector(`a[href="${href}"]`);
    // Either form has the feed and the sitemap.
    expect(link("/rss.xml")).not.toBeNull();
    expect(link("/sitemap.xml")).not.toBeNull();
    // Only the band is a footer with the navigation entries it was given.
    expect(region.querySelector("footer") !== null).toBe(band);
    expect(
      screen.queryByRole("navigation", { name: m.footer_nav_label() }) !== null,
    ).toBe(band);
    expect(screen.queryByRole("link", { name: "Nav home" }) !== null).toBe(
      band,
    );
    expect(region.textContent!.includes(m.footer_powered_by())).toBe(!band);
  },
);

it("lets the content find the slot its shell renders for the table of contents", async () => {
  let found: HTMLElement | null = null;
  function SlotReader() {
    found = useTocSlot();
    return createElement("p", null, "Page content");
  }
  const theme: Theme = {
    ...fixtureTheme,
    shell: {
      ...fixtureTheme.shell,
      Shell: (props) =>
        createElement(
          "div",
          null,
          createElement(TocSlot, { className: "rail-toc" }),
          props.children,
        ),
    },
  };
  const root = createRootRoute({
    beforeLoad: () => ({ siteConfig: resolveSiteConfig({}) }),
    loader: () => ({ currentYear: 2026 }),
    component: () =>
      createElement(PublicShell, {
        theme,
        options: {},
        navOptions: [],
        isSessionLoading: false,
        logout: async () => {},
        children: createElement(SlotReader),
      }),
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/post/hello"] }),
  });
  await act(async () => {
    render(createElement(RouterProvider, { router }));
  });

  await screen.findByText("Page content");
  expect(found).not.toBeNull();
  expect(found).toBe(document.querySelector(".rail-toc"));
});

// A navigation has two moments. The address changes with the click, and
// `pageKind` with it. The page in `main` is replaced when the next page has
// loaded, and `pageOnScreen` in that commit: the router's own pages, in the
// real page transition (`PageFade` keeps handing on `<Outlet />`, which
// renders whichever page the router presents, also while it fades out).
describe("the kinds of page it tells the shell", () => {
  /** What a commit showed: the kinds the shell was told, the page in `main`. */
  interface Commit {
    named: PageKind;
    onScreen: PageKind;
    held: string | undefined;
  }
  let commits: Array<Commit>;
  /** A page that came into `main`, and what the shell was told by then. */
  let arrivals: Array<{ page: string; onScreen: string | undefined }>;
  /** Lets the page being loaded in. */
  let finishLoading: () => void;
  let slow: boolean;

  function held() {
    return document.querySelector<HTMLElement>("main [data-page]")?.dataset
      .page;
  }

  function Page({ kind }: { kind: PageKind }) {
    const ref = useRef<HTMLParagraphElement>(null);
    useLayoutEffect(() => {
      arrivals.push({
        page: kind,
        onScreen: ref.current!.closest("main")!.dataset.onScreen,
      });
    }, [kind]);
    return createElement("p", { ref, "data-page": kind }, `A ${kind} page`);
  }

  function ProbeShell({ pageKind, pageOnScreen, children }: ThemeShellProps) {
    useLayoutEffect(() => {
      commits.push({ named: pageKind, onScreen: pageOnScreen, held: held() });
    });
    return createElement("main", { "data-on-screen": pageOnScreen }, children);
  }

  async function renderAt(path: string) {
    commits = [];
    arrivals = [];
    slow = false;
    const theme: Theme = {
      ...fixtureTheme,
      shell: { ...fixtureTheme.shell, Shell: ProbeShell },
    };
    const root = createRootRoute({
      beforeLoad: () => ({ siteConfig: resolveSiteConfig({}) }),
      loader: () => ({ currentYear: 2026 }),
      component: () =>
        createElement(PublicShell, {
          theme,
          options: {},
          navOptions: [],
          isSessionLoading: false,
          logout: async () => {},
          children: createElement(Outlet),
        }),
    });
    const loader = () =>
      slow
        ? new Promise<void>((resolve) => {
            finishLoading = resolve;
          })
        : undefined;
    const page = (routePath: string, kind: PageKind) =>
      createRoute({
        getParentRoute: () => root,
        path: routePath,
        loader,
        component: () => createElement(Page, { kind }),
      });
    const router = createRouter({
      routeTree: root.addChildren([
        page("/", "home"),
        page("/posts", "inner"),
        page("/post/$slug", "post"),
        page("/profile", "focused"),
      ]),
      history: createMemoryHistory({ initialEntries: [path] }),
    });
    await act(async () => {
      render(createElement(RouterProvider, { router }));
    });
    await screen.findByText(/^A \w+ page$/);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    return router;
  }

  async function after(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }

  /** No commit, and no page that came in, saw a page under another's kind. */
  function expectNoPageUnderAnothersKind() {
    expect(commits.length).toBeGreaterThan(0);
    for (const commit of commits) expect(commit.held).toBe(commit.onScreen);
    for (const arrival of arrivals) expect(arrival.page).toBe(arrival.onScreen);
  }

  it.each([
    ["/", "home"],
    ["/posts", "inner"],
    ["/post/hello", "post"],
    ["/profile", "focused"],
  ] as const)("names the page a reader lands on at %s", async (path, kind) => {
    await renderAt(path);

    expect(commits.at(-1)).toEqual({ named: kind, onScreen: kind, held: kind });
  });

  it.each([
    ["/posts", "/post/hello", "inner", "post"],
    ["/post/hello", "/posts", "post", "inner"],
    ["/", "/post/hello", "home", "post"],
    ["/post/hello", "/profile", "post", "focused"],
  ] as const)(
    "changes the page on screen from %s to %s in the commit that replaces the page, while it fades",
    async (from, to, left, next) => {
      const router = await renderAt(from);

      await act(async () => {
        await router.navigate({ href: to });
      });
      // The next page is in `main` while the transition still fades out.
      expect(held()).toBe(next);
      expect(document.querySelector(".fuwari-page-fade")!.classList).toContain(
        "is-leaving",
      );
      expect(commits.at(-1)).toEqual({
        named: next,
        onScreen: next,
        held: next,
      });

      await after(PAGE_FADE_MS);
      expect(
        document.querySelector(".fuwari-page-fade")!.classList,
      ).not.toContain("is-leaving");
      expect(commits.at(-1)).toMatchObject({ onScreen: next, held: next });
      expect(commits.some((commit) => commit.onScreen === left)).toBe(true);
      expectNoPageUnderAnothersKind();
    },
  );

  it.each([
    ["/post/hello", "/posts", "post", "inner"],
    ["/posts", "/post/hello", "inner", "post"],
  ] as const)(
    "keeps the page on screen from %s to %s for as long as the next page takes to load, past the fade",
    async (from, to, left, next) => {
      const router = await renderAt(from);
      slow = true;

      await act(async () => {
        void router.navigate({ href: to });
      });
      // The address names the next page; `main` holds the one that is left.
      expect(commits.at(-1)).toEqual({
        named: next,
        onScreen: left,
        held: left,
      });

      // The transition lets the page that is left back in when it has faded
      // out and nothing has come: still that page, still its kind.
      await after(2 * PAGE_FADE_MS);
      expect(held()).toBe(left);
      expect(commits.at(-1)).toEqual({
        named: next,
        onScreen: left,
        held: left,
      });

      await act(async () => {
        finishLoading();
      });
      expect(commits.at(-1)).toEqual({
        named: next,
        onScreen: next,
        held: next,
      });
      expectNoPageUnderAnothersKind();
    },
  );

  it("changes both at once for a reader who asked for less motion", async () => {
    reducedMotion.matches = true;
    const router = await renderAt("/posts");

    await act(async () => {
      await router.navigate({ href: "/post/hello" });
    });

    expect(commits.at(-1)).toEqual({
      named: "post",
      onScreen: "post",
      held: "post",
    });
    expectNoPageUnderAnothersKind();
  });
});
