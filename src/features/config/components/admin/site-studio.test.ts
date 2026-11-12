// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  DEFAULT_CONFIG,
  type SystemConfig,
} from "@/features/config/config.schema";
import { m } from "@/paraglide/messages";
import { SiteStudio } from "./site-studio";

vi.mock("@/lib/orpc", () => ({
  orpcClient: { config: { admin: { uploadAsset: vi.fn() } } },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) =>
    createElement("a", { ...rest, href: to }, children),
}));

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

function renderSite() {
  function Harness() {
    const methods = useForm<SystemConfig>({
      defaultValues: structuredClone(DEFAULT_CONFIG),
    });
    return createElement(FormProvider<SystemConfig>, {
      ...methods,
      children: createElement(SiteStudio),
    });
  }
  render(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(Harness),
    ),
  );
}

it("keeps only the identity fields: title, author, description, social links, navigation links and site icons", () => {
  renderSite();
  expect(screen.getByLabelText(m.settings_site_field_title())).toBeTruthy();
  expect(screen.getByLabelText(m.settings_site_field_author())).toBeTruthy();
  expect(
    screen.getByLabelText(m.settings_site_field_description()),
  ).toBeTruthy();
  expect(screen.getByText(m.settings_site_nav_title())).toBeTruthy();
  expect(screen.getByText(m.settings_icons())).toBeTruthy();
});

it("no longer has the presentation controls, which are on the personalize page", () => {
  renderSite();
  for (const label of [
    m.settings_theme(),
    m.settings_hue(),
    m.settings_brand_mark(),
    m.settings_tagline(),
    m.settings_banner_focus(),
  ]) {
    expect(screen.queryByText(label)).toBeNull();
  }
  expect(screen.queryByRole("radiogroup")).toBeNull();
  expect(screen.queryByRole("slider")).toBeNull();
  expect(
    screen.queryByRole("button", { name: m.settings_site_banner_upload() }),
  ).toBeNull();
  expect(
    screen.queryByRole("button", { name: m.settings_site_avatar_upload() }),
  ).toBeNull();
});

it("points to the personalize page", () => {
  renderSite();
  const link = screen.getByRole("link", {
    name: m.settings_site_moved_to_personalize_link(),
  });
  expect(link.getAttribute("href")).toBe("/admin/personalize");
});
