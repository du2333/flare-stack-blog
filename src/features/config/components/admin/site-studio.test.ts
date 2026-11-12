// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  DEFAULT_CONFIG,
  type SystemConfig,
} from "@/features/config/config.schema";
import { SITE_DESCRIPTION_MAX } from "@/features/config/site-config.schema";
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

function renderSite(site: Partial<NonNullable<SystemConfig["site"]>> = {}) {
  const form: { current?: UseFormReturn<SystemConfig> } = {};
  function Harness() {
    const methods = useForm<SystemConfig>({
      defaultValues: {
        ...structuredClone(DEFAULT_CONFIG),
        site: { ...structuredClone(DEFAULT_CONFIG.site), ...site },
      },
    });
    form.current = methods;
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
  return () => form.current!;
}

it("shows each identity field as a labelled input that is always there, with a hint of where it shows", () => {
  const form = renderSite({
    title: "My blog",
    author: "Me",
    description: "About this blog",
  });
  const title = screen.getByLabelText(m.settings_site_field_title());
  const author = screen.getByLabelText(m.settings_site_field_author());
  const description = screen.getByLabelText(
    m.settings_site_field_description(),
  );

  expect((title as HTMLInputElement).value).toBe("My blog");
  expect((author as HTMLInputElement).value).toBe("Me");
  expect(description.tagName).toBe("TEXTAREA");
  expect((description as HTMLTextAreaElement).value).toBe("About this blog");
  // The hints are the controls' descriptions.
  for (const [input, hint] of [
    [title, m.settings_site_title_hint()],
    [author, m.settings_site_author_hint()],
    [description, m.settings_site_description_hint()],
  ] as const) {
    const described = input.getAttribute("aria-describedby")!;
    expect(
      document.getElementById(described.split(" ")[0])!.textContent,
    ).toContain(hint);
  }

  fireEvent.change(title, { target: { value: "Renamed" } });
  expect(form().getValues("site.title")).toBe("Renamed");
});

it("counts the description against its limit", () => {
  renderSite({ description: "four" });
  const description = screen.getByLabelText(
    m.settings_site_field_description(),
  );
  expect(
    screen.getByText(
      m.settings_site_char_count({ count: 4, max: SITE_DESCRIPTION_MAX }),
    ),
  ).toBeTruthy();
  fireEvent.change(description, { target: { value: "twelve chars" } });
  expect(
    screen.getByText(
      m.settings_site_char_count({ count: 12, max: SITE_DESCRIPTION_MAX }),
    ),
  ).toBeTruthy();
});

it("shows a validation error beside its field", () => {
  const form = renderSite();
  act(() => {
    form().setError("site.title", { message: "Too long" });
  });
  const title = screen.getByLabelText(m.settings_site_field_title());
  expect(title.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByText("Too long")).toBeTruthy();
});

it("edits the social links as rows: platform, address, remove, and an add button", () => {
  const form = renderSite({
    social: [{ platform: "github", url: "https://github.com/me" }],
  });
  const platforms = () =>
    screen.getAllByRole("button", { name: m.settings_social_platform_label() });
  const addresses = () =>
    screen.getAllByLabelText(m.settings_social_address_label());
  expect(platforms()).toHaveLength(1);
  expect((addresses()[0] as HTMLInputElement).value).toBe(
    "https://github.com/me",
  );

  fireEvent.change(addresses()[0], {
    target: { value: "https://github.com/you" },
  });
  expect(form().getValues("site.social.0.url")).toBe("https://github.com/you");

  fireEvent.click(
    screen.getByRole("button", { name: m.settings_social_add() }),
  );
  expect(platforms()).toHaveLength(2);
  // The new row takes a platform no row has.
  expect(form().getValues("site.social.1.platform")).not.toBe("github");
  expect(form().getValues("site.social.1.url")).toBe("");

  const removes = screen.getAllByRole("button", {
    name: m.settings_social_remove(),
  });
  fireEvent.click(removes[0]);
  expect(platforms()).toHaveLength(1);
  expect(form().getValues("site.social")).toHaveLength(1);
});

it("asks for a name and an icon on a custom platform only", () => {
  renderSite({ social: [{ platform: "custom", url: "https://x.example" }] });
  expect(screen.getByLabelText(m.settings_social_label_label())).toBeTruthy();
  expect(
    screen.getByRole("button", {
      name: m.settings_social_custom_icon_upload(),
    }),
  ).toBeTruthy();
  cleanup();
  renderSite({ social: [{ platform: "github", url: "https://github.com/x" }] });
  expect(screen.queryByLabelText(m.settings_social_label_label())).toBeNull();
});

it("keeps the navigation links and the site icons", () => {
  renderSite();
  expect(screen.getByText(m.settings_site_nav_title())).toBeTruthy();
  expect(screen.getByText(m.settings_icons())).toBeTruthy();
});

it("has no in-place editing and no presentation controls, which are on the personalize page", () => {
  renderSite();
  expect(document.querySelector(".site-inline-input")).toBeNull();
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

it("points to the personalize page with a quiet hint after the form", () => {
  renderSite();
  const link = screen.getByRole("link", {
    name: m.settings_site_moved_to_personalize_link(),
  });
  expect(link.getAttribute("href")).toBe("/admin/personalize");
  const hint = link.closest("p")!;
  expect(hint.textContent).toContain(m.settings_site_moved_to_personalize());
  // At the foot of the page, not above the fields.
  const title = screen.getByLabelText(m.settings_site_field_title());
  expect(
    title.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(within(hint).getAllByRole("link")).toHaveLength(1);
});
