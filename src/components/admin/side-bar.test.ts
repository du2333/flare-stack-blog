// @vitest-environment jsdom
import { cleanup, render, within } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import zh from "../../../messages/zh.json";
import { m } from "@/paraglide/messages";
import { SideBar } from "./side-bar";

vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({}) }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: ReactNode | ((state: { isActive: boolean }) => ReactNode);
  }) =>
    createElement(
      "a",
      { href: to, ...rest },
      typeof children === "function" ? children({ isActive: false }) : children,
    ),
  useNavigate: () => vi.fn(),
  useRouteContext: () => ({ siteConfig: { title: "Blog" } }),
}));
vi.mock("@/features/auth/queries", () => ({ resetAuthBoundQueries: vi.fn() }));
vi.mock("@/lib/auth/auth-client", () => ({
  getAuthClient: () => ({ signOut: vi.fn() }),
  useSession: () => ({ data: { user: { name: "Admin", role: "admin" } } }),
}));
vi.mock("@/components/common/colour-scheme-toggle", () => ({
  ColourSchemeToggle: () => null,
}));

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  HTMLDialogElement.prototype.close = vi.fn();
  HTMLDialogElement.prototype.showModal = vi.fn();
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: vi.fn(() => ({ cancel: vi.fn() })),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("lists 「个性化」 beside 「设置」, on its own page", () => {
  render(
    createElement(SideBar, {
      isMobileSidebarOpen: false,
      closeMobileSidebar: vi.fn(),
      collapsed: false,
      onToggleCollapse: vi.fn(),
    }),
  );
  const nav = document.querySelector("nav")!;
  const links = within(nav).getAllByRole("link");
  const hrefs = links.map((link) => link.getAttribute("href"));
  expect(hrefs).toContain("/admin/personalize");
  expect(hrefs.indexOf("/admin/personalize")).toBe(
    hrefs.indexOf("/admin/settings") - 1,
  );
  expect(
    within(nav)
      .getByRole("link", { name: m.admin_sidebar_personalize() })
      .getAttribute("href"),
  ).toBe("/admin/personalize");
  // The entry is called 个性化, never 外观.
  expect(zh.admin_sidebar_personalize).toBe("个性化");
});
