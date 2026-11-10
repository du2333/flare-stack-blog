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
import { useThemeRecipe } from "../recipe-placeholder";
import type { ThemeShellProps } from "../theme-shell";
import type { Theme } from "../themes";
import { PublicShell } from "./public-shell";

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
    recipe: { postCard: "spy-row" },
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
        options: { marker: false },
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

  expect(await screen.findByText("recipe spy-row")).toBeTruthy();
  expect(received.at(-1)).toMatchObject({
    pageKind: "focused",
    options: { marker: false },
    sidebarCards: [],
  });
});
