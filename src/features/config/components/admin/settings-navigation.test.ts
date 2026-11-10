// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  type ErrorComponentProps,
  type RouteComponent,
} from "@tanstack/react-router";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { createElement } from "react";
import { useFormContext } from "react-hook-form";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminChromeProvider } from "@/components/admin/admin-chrome";
import { PageFade } from "@/components/layout/page-fade";
import {
  DEFAULT_CONFIG,
  type SystemConfig,
} from "@/features/config/config.schema";
import { m } from "@/paraglide/messages";
import { Route as SettingsRoute } from "@/routes/admin/settings/route";
import { settingsSectionFromPath } from "./settings-pages";

vi.mock("@/features/config/queries", () => ({
  systemConfigQuery: { queryKey: ["settings-navigation"] },
}));
vi.mock("@/features/config/hooks/use-system-setting", async () => {
  const { DEFAULT_CONFIG } = await import("@/features/config/config.schema");
  const snapshot = {
    config: DEFAULT_CONFIG,
    revisions: { site: 0, notifications: 0 },
    secrets: {
      emailPasswordConfigured: false,
      webhookSecretConfigured: false,
    },
    schemaVersion: 1,
  };
  return {
    useSystemSetting: () => ({
      snapshot,
      reload: vi.fn(),
      saveSettings: vi.fn(),
      isLoading: false,
    }),
  };
});

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  HTMLElement.prototype.scrollTo = vi.fn();
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: vi.fn(() => ({ cancel: vi.fn() })),
  });
  HTMLDialogElement.prototype.close = vi.fn();
  HTMLDialogElement.prototype.showModal = vi.fn();
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
    const caught: Array<unknown> = [];
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
      defaultErrorComponent: ({ error }: ErrorComponentProps) => {
        caught.push(error);
        return createElement(
          "p",
          null,
          error instanceof Error ? error.message : String(error),
        );
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

it("shows the muted users list as a settings tab without a save bar", async () => {
  const root = createRootRoute({
    component: () =>
      createElement(AdminChromeProvider, null, createElement(Outlet)),
  });
  const settings = createRoute({
    getParentRoute: () => root,
    path: "/admin/settings",
    component: SettingsRoute.options.component as RouteComponent,
  });
  const mutedUsers = createRoute({
    getParentRoute: () => settings,
    path: "muted-users",
    component: () => createElement("h2", null, "Muted list"),
  });
  const router = createRouter({
    routeTree: root.addChildren([settings.addChildren([mutedUsers])]),
    history: createMemoryHistory({
      initialEntries: ["/admin/settings/muted-users"],
    }),
    context: { queryClient: new QueryClient() },
  });
  render(createElement(RouterProvider, { router }));
  await screen.findByRole("heading", { name: "Muted list" });
  expect(
    screen
      .getByRole("link", { name: m.muted_users_title() })
      .getAttribute("aria-current"),
  ).toBe("page");
  expect(document.querySelector(".settings-savebar")).toBeNull();
});

it("maps the muted users path to its settings tab", () => {
  expect(settingsSectionFromPath("/admin/settings/muted-users/")).toBe(
    "muted-users",
  );
});

it("shows the save bar only once the section has unsaved changes", async () => {
  const root = createRootRoute({
    component: () =>
      createElement(AdminChromeProvider, null, createElement(Outlet)),
  });
  const settings = createRoute({
    getParentRoute: () => root,
    path: "/admin/settings",
    component: SettingsRoute.options.component as RouteComponent,
  });
  const site = createRoute({
    getParentRoute: () => settings,
    path: "site",
    component: FormRoute,
  });
  const router = createRouter({
    routeTree: root.addChildren([settings.addChildren([site])]),
    history: createMemoryHistory({ initialEntries: ["/admin/settings/site"] }),
    context: { queryClient: new QueryClient() },
  });
  render(createElement(RouterProvider, { router }));
  const input = await screen.findByRole("textbox", { name: "Site title" });
  expect(document.querySelector(".settings-savebar")).toBeNull();
  fireEvent.input(input, { target: { value: "A new title" } });
  const bar = await screen.findByRole("button", {
    name: m.settings_config_save_site(),
  });
  expect(bar.closest(".settings-savebar")).not.toBeNull();
  // The tab names the section; the page header carries no description.
  expect(
    screen.queryByText(m.settings_nav_site(), { selector: "h2" }),
  ).toBeNull();
  expect(
    screen.getByRole("region", { name: m.settings_nav_site() }),
  ).not.toBeNull();
});
