import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { fixtureTheme } from "tests/theme-fixture/theme";
import { describe, expect, it, vi } from "vitest";
import { categoriesQueryOptions } from "@/features/categories/queries";
import { resolveSiteConfig } from "@/features/config/config.resolve";
import { momentsExistQuery } from "@/features/moments/queries";
import { tagsQueryOptions } from "@/features/tags/queries";
import { Route as PublicRoute } from "@/routes/_public/route";
import { THEMES } from "../themes";
import { documentThemeId } from "../utils/document-theme";
import {
  themePreviewHref,
  withoutThemePreview,
} from "../utils/theme-preview-params";

// As in a THEME_FIXTURE=1 build, so the fixture Theme can be previewed.
vi.mock("virtual:fixture-themes", async () => ({
  FIXTURE_THEMES: [(await import("tests/theme-fixture/theme")).fixtureTheme],
}));

const saved = resolveSiteConfig({});
const preview = { id: fixtureTheme.id, options: { marker: "off" } };

// A card that waits for its entries shows a placeholder, which gives way to
// nothing on a site without categories or tags, and what follows it jumps.
describe("what every public page has before it is rendered", () => {
  it("has the Moments answer, the categories and the tags, so a sidebar card never stands in for itself", async () => {
    const prefetchQuery = vi.fn(async (_query: { queryKey: unknown }) => {});
    const loader = PublicRoute.options.loader as unknown as (context: {
      context: { queryClient: { prefetchQuery: typeof prefetchQuery } };
    }) => Promise<void>;

    await loader({ context: { queryClient: { prefetchQuery } } });

    expect(prefetchQuery.mock.calls.map(([query]) => query.queryKey)).toEqual([
      momentsExistQuery.queryKey,
      categoriesQueryOptions.queryKey,
      tagsQueryOptions.queryKey,
    ]);
  });
});

describe("the page while previewing", () => {
  type HeadContext = Parameters<
    NonNullable<typeof PublicRoute.options.head>
  >[0];
  const headFor = (themePreview: typeof preview | null) =>
    PublicRoute.options.head!({
      match: { context: { siteConfig: saved, themePreview } },
    } as unknown as HeadContext);

  it("links the previewed Theme's stylesheet instead of the saved one's", async () => {
    expect((await headFor(preview))?.links).toEqual([
      { rel: "stylesheet", href: fixtureTheme.stylesheet },
    ]);
    expect((await headFor(null))?.links).toEqual([
      { rel: "stylesheet", href: THEMES[0]!.stylesheet },
    ]);
  });

  it("puts the previewed Theme on the document root of public pages only", () => {
    expect(documentThemeId(["__root__", "/_public"], preview.id)).toBe(
      "fixture",
    );
    expect(documentThemeId(["__root__", "/admin"], preview.id)).toBeUndefined();
  });
});

describe("navigation while previewing", () => {
  async function routerAt(href: string) {
    const root = createRootRoute();
    const publicLayout = createRoute({
      getParentRoute: () => root,
      id: "_public",
      search: PublicRoute.options.search,
    });
    const router = createRouter({
      routeTree: root.addChildren([
        publicLayout.addChildren([
          createRoute({ getParentRoute: () => publicLayout, path: "/" }),
          createRoute({ getParentRoute: () => publicLayout, path: "/posts" }),
        ]),
        createRoute({ getParentRoute: () => root, path: "/admin" }),
      ]),
      history: createMemoryHistory({ initialEntries: [href] }),
    });
    await router.load();
    return router;
  }
  const href = themePreviewHref(fixtureTheme.id, { marker: "off" });

  it("keeps the preview on links to other public pages", async () => {
    const router = await routerAt(href);
    expect(router.buildLocation({ to: "/posts" }).search).toEqual({
      themePreview: "fixture",
      themePreviewOptions: { marker: "off" },
    });
    expect(router.buildLocation({ to: "/posts" }).href).toBe(
      `/posts${href.slice(1)}`,
    );
  });

  it("leaves it behind for the Admin and on leaving the preview", async () => {
    const router = await routerAt(href);
    expect(router.buildLocation({ to: "/admin" }).href).toBe("/admin");
    expect(
      router.buildLocation({
        to: ".",
        search: (previous: Record<string, unknown>) =>
          withoutThemePreview(previous),
      }).href,
    ).toBe("/");
  });

  it("adds nothing to the links of a page that is not a preview", async () => {
    const router = await routerAt("/?page=2");
    expect(router.buildLocation({ to: "/posts" }).href).toBe("/posts");
  });
});
