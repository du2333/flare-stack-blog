import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import type { NavOption } from "@/components/layout/layout-props";
import { resolveSiteConfig } from "@/features/config/config.resolve";
import type { SystemConfig } from "@/features/config/config.schema";
import { ThemeRecipeProvider } from "@/features/theme/components/theme-recipe";
import {
  DEFAULT_THEME_RECIPE,
  type ThemeRecipe,
} from "@/features/theme/theme-recipe";
import { m } from "@/paraglide/messages";
import { Footer } from ".";

/** Shaped like the host's list: the built-in entries, then the custom links. */
export const NAV_OPTIONS: Array<NavOption> = [
  { id: "home", label: "Nav home", href: "/", external: false },
  { id: "posts", label: "Nav posts", href: "/posts", external: false },
  { id: "moments", label: "Nav moments", href: "/moments", external: false },
  {
    id: "friend-links",
    label: "Nav friends",
    href: "/friend-links",
    external: false,
  },
  { id: "custom-0", label: "Nav post", href: "/post/hello", external: false },
  { id: "custom-1", label: "Nav about", href: "/about", external: false },
  {
    id: "custom-2",
    label: "Nav elsewhere",
    href: "https://example.com/",
    external: true,
  },
];

export const SITE: SystemConfig["site"] = {
  title: "Engine Notes",
  author: "Ada",
  description: "Notes on engines.",
  tagline: "Slow and exact",
  social: [{ platform: "github", url: "https://github.com/ada" }],
};

export const COPYRIGHT = m.footer_copyright({ year: "2026", author: "Ada" });

/**
 * Renders the footer as the host does, under a recipe with this form of it,
 * and returns the element around it. The router restores the scroll
 * position, which jsdom cannot: stub `scrollTo` first.
 */
export async function renderFooter({
  form,
  site = SITE,
  navOptions = NAV_OPTIONS,
  path = "/",
}: {
  /** Left out: outside any provider. */
  form?: ThemeRecipe["footer"];
  site?: SystemConfig["site"];
  navOptions?: Array<NavOption>;
  path?: string;
} = {}) {
  const footer = createElement(Footer, { navOptions });
  const root = createRootRoute({
    beforeLoad: () => ({ siteConfig: resolveSiteConfig({ site }) }),
    loader: () => ({ currentYear: 2026 }),
    component: () =>
      createElement(
        "div",
        { "data-testid": "host" },
        form
          ? createElement(ThemeRecipeProvider, {
              recipe: { ...DEFAULT_THEME_RECIPE, footer: form },
              children: footer,
            })
          : footer,
      ),
    // A custom link may point anywhere on the site.
    notFoundComponent: () => null,
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await act(async () => {
    render(createElement(RouterProvider, { router }));
  });
  return screen.findByTestId("host");
}

export function linksTo(host: HTMLElement, href: string) {
  return within(host)
    .queryAllByRole("link")
    .filter((link) => link.getAttribute("href") === href);
}

export function opensInNewTab(link: HTMLElement) {
  return (
    link.getAttribute("target") === "_blank" &&
    link.getAttribute("rel") === "noreferrer"
  );
}
