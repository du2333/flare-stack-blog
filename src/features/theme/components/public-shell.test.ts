// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { fixtureTheme } from "tests/theme-fixture/theme";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resolveSiteConfig } from "@/features/config/config.resolve";
import { m } from "@/paraglide/messages";
import { DEFAULT_THEME_RECIPE, type ThemeRecipe } from "../theme-recipe";
import type { ThemeShellProps } from "../theme-shell";
import type { Theme } from "../themes";
import { PublicShell } from "./public-shell";
import { useThemeRecipe } from "./theme-recipe";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
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
