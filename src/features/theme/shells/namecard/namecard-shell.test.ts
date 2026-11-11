// @vitest-environment jsdom
// What only 「名片」 does; what every shell must do is in ../theme-shells.test.ts.
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveSiteConfig } from "@/features/config/config.resolve";
import type { SystemConfig } from "@/features/config/config.schema";
import { m } from "@/paraglide/messages";
import type { PageKind, ThemeShellProps } from "../../theme-shell";
import { resolveThemeOptions, selectTheme } from "../../themes";
import { DEFAULT_FRAME, FRAMES } from "./frame";

vi.mock("@/components/common/colour-scheme-provider", () => ({
  useColourScheme: () => ({
    colourSchemePreference: "system",
    colourScheme: "light",
    setColourScheme: vi.fn(),
  }),
}));

const theme = selectTheme("namecard");

async function renderShell({
  pageKind,
  site,
  stored,
}: {
  pageKind: PageKind;
  site?: SystemConfig["site"];
  stored?: Record<string, unknown>;
}) {
  const props: ThemeShellProps = {
    pageKind,
    options: resolveThemeOptions(theme, stored),
    navOptions: [{ id: "home", label: "Nav home", href: "/", external: false }],
    sidebarCards: [],
    isSessionLoading: false,
    logout: async () => {},
    children: createElement("p", null, "Page content"),
    footer: null,
    floatingActions: null,
  };
  const root = createRootRoute({
    beforeLoad: () => ({ siteConfig: resolveSiteConfig({ site }) }),
    loader: () => ({ currentYear: 2026 }),
    component: () => createElement(theme.shell.Shell, props),
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await act(async () => {
    render(createElement(RouterProvider, { router }));
  });
  await screen.findByText("Page content");
}

function shell() {
  return document.querySelector<HTMLElement>('[data-theme-shell="namecard"]')!;
}

function firstScreen() {
  return screen.getByAltText("banner").closest("section")!;
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("scrollTo", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the first screen", () => {
  it("greets with the author's name set apart on the home page", async () => {
    await renderShell({
      pageKind: "home",
      site: { author: "Ada", description: "Notes on engines." },
    });

    const greeting = screen.getByRole("heading", { level: 1 });
    expect(greeting.textContent).toBe(
      m.theme_namecard_greeting_hello() +
        m.theme_namecard_greeting_name({ author: "Ada" }),
    );
    expect(greeting.querySelector("em")!.textContent).toBe("Ada");
    expect(screen.getByText("Notes on engines.")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: m.theme_namecard_read_posts() })
        .getAttribute("href"),
    ).toBe("/posts");
    expect(firstScreen().dataset.open).toBe("true");
    expect(firstScreen().hasAttribute("inert")).toBe(false);
  });

  it.each(["inner", "focused"] as const)(
    "is folded on a %s page: no text, out of reach, the banner kept for the way back",
    async (pageKind) => {
      await renderShell({
        pageKind,
        site: { description: "Notes on engines." },
      });

      expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
      expect(screen.queryByText("Notes on engines.")).toBeNull();
      expect(
        screen.queryByRole("link", { name: m.theme_namecard_read_posts() }),
      ).toBeNull();
      expect(firstScreen().dataset.open).toBe("false");
      expect(firstScreen().hasAttribute("inert")).toBe(true);
      expect(firstScreen().getAttribute("aria-hidden")).toBe("true");
    },
  );

  it("sets the avatar on the frame as a seal", async () => {
    await renderShell({ pageKind: "home" });

    const images = [...firstScreen().querySelectorAll("img")];
    expect(images).toHaveLength(2);
    expect(images[1].getAttribute("src")).toContain("avatar");
  });

  it("leaves the seal out when the avatar is the brand mark", async () => {
    await renderShell({ pageKind: "home", site: { brandMark: "avatar" } });

    expect([...firstScreen().querySelectorAll("img")]).toHaveLength(1);
  });
});

describe("the frame shape", () => {
  it("is portrait by default", async () => {
    await renderShell({ pageKind: "home" });

    expect(DEFAULT_FRAME).toBe("portrait");
    expect(shell().dataset.frame).toBe("portrait");
  });

  it.each(FRAMES)("follows the stored option: %s", async (frame) => {
    await renderShell({ pageKind: "home", stored: { frame } });

    expect(shell().dataset.frame).toBe(frame);
  });

  it("falls back to the default for a value it does not know", async () => {
    await renderShell({ pageKind: "home", stored: { frame: "square" } });

    expect(shell().dataset.frame).toBe(DEFAULT_FRAME);
  });

  it("offers the Admin every shape, each with a label", () => {
    const [field] = theme.optionFields!;
    expect(field.key).toBe("frame");
    expect(field.label()).not.toBe("");
    expect(field.choices.map((choice) => choice.value)).toEqual([...FRAMES]);
    for (const choice of field.choices) {
      expect(choice.label()).not.toBe("");
    }
  });
});
