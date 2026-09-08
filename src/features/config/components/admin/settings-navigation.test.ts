// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  type RouteComponent,
} from "@tanstack/react-router";
import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { useFormContext } from "react-hook-form";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminChromeProvider } from "@/components/admin/admin-chrome";
import { PageFade } from "@/components/layout/page-fade";
import {
  DEFAULT_CONFIG,
  type SystemConfig,
} from "@/features/config/config.schema";
import { Route as SettingsRoute } from "@/routes/admin/settings/route";
import { settingsSectionFromPath } from "./settings-pages";

vi.mock("@/features/config/queries", () => ({
  systemConfigQuery: { queryKey: ["settings-navigation"] },
}));
vi.mock("@/features/config/hooks/use-system-setting", async () => {
  const { DEFAULT_CONFIG } = await import("@/features/config/config.schema");
  return {
    useSystemSetting: () => ({
      settings: DEFAULT_CONFIG,
      saveSettings: vi.fn(),
      isLoading: false,
    }),
  };
});

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Like SiteStudio and NotifyStudio, this route requires the parent's form.
// Keep the real router, settings layout and PageFade: a standalone form test
// cannot expose an outgoing match rendering after the pathname has changed.
function FormRoute() {
  const { register } = useFormContext<SystemConfig>();
  return createElement("input", {
    "aria-label": "Site title",
    ...register("site.title"),
  });
}

it.each(["site", "notifications"])(
  "keeps form context while leaving and reentering %s through the directory",
  async (section) => {
    const caught: Array<Error> = [];
    const root = createRootRoute({
      component: () =>
        createElement(
          AdminChromeProvider,
          null,
          createElement(PageFade, {
            includeSearch: false,
            pathKey: (path) =>
              settingsSectionFromPath(path) ? "/admin/settings/*" : path,
            children: createElement(Outlet),
          }),
        ),
    });
    const settings = createRoute({
      getParentRoute: () => root,
      path: "/admin/settings",
      component: SettingsRoute.options.component as RouteComponent,
    });
    const directory = createRoute({
      getParentRoute: () => settings,
      path: "/",
      component: () => createElement("h1", null, "Settings directory"),
    });
    const child = createRoute({
      getParentRoute: () => settings,
      path: section,
      component: FormRoute,
    });
    const router = createRouter({
      routeTree: root.addChildren([settings.addChildren([directory, child])]),
      history: createMemoryHistory({
        initialEntries: [`/admin/settings/${section}`],
      }),
      context: { queryClient: new QueryClient() },
      defaultErrorComponent: ({ error }) => {
        caught.push(error);
        return createElement("p", null, error.message);
      },
    });
    render(createElement(RouterProvider, { router }));
    expect(
      (
        (await screen.findByRole("textbox", {
          name: "Site title",
        })) as HTMLInputElement
      ).value,
    ).toBe(DEFAULT_CONFIG.site?.title);
    await act(async () => {
      await router.navigate({ to: "/admin/settings" });
    });
    await screen.findByRole("heading", { name: "Settings directory" });
    expect(caught).toEqual([]);
    await act(async () => {
      await router.navigate({ to: `/admin/settings/${section}` });
    });
    await screen.findByRole("textbox", { name: "Site title" });
    expect(caught).toEqual([]);
  },
);
