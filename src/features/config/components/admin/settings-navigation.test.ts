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
import {
  accessSectionFromPath,
  LEGACY_SETTINGS_TAB_TO,
  MOVED_SETTINGS_PAGE_TO,
  settingsSectionFromPath,
} from "./settings-pages";

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

it("keeps only site, notifications and maintenance as settings tabs", async () => {
  const root = createRootRoute({
    component: () =>
      createElement(AdminChromeProvider, null, createElement(Outlet)),
  });
  const settings = createRoute({
    getParentRoute: () => root,
    path: "/admin/settings",
    component: SettingsRoute.options.component as RouteComponent,
  });
  const maintenance = createRoute({
    getParentRoute: () => settings,
    path: "maintenance",
    component: () => createElement("h2", null, "Maintenance"),
  });
  const router = createRouter({
    routeTree: root.addChildren([settings.addChildren([maintenance])]),
    history: createMemoryHistory({
      initialEntries: ["/admin/settings/maintenance"],
    }),
    context: { queryClient: new QueryClient() },
  });
  render(createElement(RouterProvider, { router }));
  await screen.findByRole("heading", { name: "Maintenance" });
  const tabs = screen.getByRole("navigation", {
    name: m.settings_header_title(),
  });
  expect(
    [...tabs.querySelectorAll("a")].map((link) => link.getAttribute("href")),
  ).toEqual([
    "/admin/settings/site",
    "/admin/settings/notifications",
    "/admin/settings/maintenance",
  ]);
  expect(
    screen
      .getByRole("link", { name: m.settings_nav_maintenance() })
      .getAttribute("aria-current"),
  ).toBe("page");
  expect(document.querySelector(".settings-savebar")).toBeNull();
});

it("sends the pages that left 「设置」 to their new addresses", () => {
  expect(MOVED_SETTINGS_PAGE_TO).toEqual({
    "api-keys": "/admin/access/api-keys",
    "agent-skill": "/admin/access/agent-skill",
    "muted-users": "/admin/muted-users",
  });
  expect(LEGACY_SETTINGS_TAB_TO["api-keys"]).toBe("/admin/access/api-keys");
  expect(settingsSectionFromPath("/admin/settings/muted-users/")).toBeNull();
  expect(accessSectionFromPath("/admin/access/agent-skill/")).toBe(
    "agent-skill",
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
