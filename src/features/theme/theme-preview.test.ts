import { defaultParseSearch } from "@tanstack/react-router";
import { fixtureTheme } from "tests/theme-fixture/theme";
import { describe, expect, it, vi } from "vitest";
import { resolveSiteConfig } from "@/features/config/config.resolve";
import {
  activeTheme,
  readThemePreview,
  resolveThemePreview,
} from "./theme-preview";
import { THEMES } from "./themes";
import {
  carryThemePreview,
  hasSessionCookie,
  themePreviewHref,
  withoutThemePreview,
} from "./utils/theme-preview-params";

const themes = [...THEMES, fixtureTheme];
const [classic] = THEMES;

/** The search the router parses from a preview address. */
function searchOf(href: string) {
  return defaultParseSearch(new URL(href, "https://blog.example").search);
}

describe("readThemePreview", () => {
  it("reads the Theme and its options from the address the Admin opens", () => {
    const search = searchOf(themePreviewHref("fixture", { marker: "off" }));
    expect(readThemePreview(search, themes)).toEqual({
      id: "fixture",
      options: { marker: "off" },
    });
  });

  it("falls back to each option's default instead of failing", () => {
    for (const options of [
      undefined,
      "not json",
      "[1,2]",
      JSON.stringify({ marker: "sideways", stale: 1 }),
      { marker: 3 },
    ]) {
      expect(
        readThemePreview(
          { themePreview: "fixture", themePreviewOptions: options },
          themes,
        ),
      ).toEqual({ id: "fixture", options: { marker: "on" } });
    }
  });

  it("asks for no preview without a registered Theme", () => {
    expect(readThemePreview({}, themes)).toBeNull();
    expect(readThemePreview({ themePreview: "gone" }, themes)).toBeNull();
    expect(readThemePreview({ themePreview: 1 }, themes)).toBeNull();
    // The fixture is not in the registry of a real build.
    expect(readThemePreview({ themePreview: "fixture" })).toBeNull();
  });
});

describe("resolveThemePreview", () => {
  const search = { themePreview: "fixture", themePreviewOptions: "{}" };

  it("never asks about the viewer when the page asks for no preview", async () => {
    const viewerIsAdmin = vi.fn(async () => true);
    expect(await resolveThemePreview({ page: 2 }, viewerIsAdmin, themes)).toBe(
      null,
    );
    expect(viewerIsAdmin).not.toHaveBeenCalled();
  });

  it("gives the preview to an Admin only", async () => {
    expect(await resolveThemePreview(search, async () => true, themes)).toEqual(
      { id: "fixture", options: { marker: "on" } },
    );
    expect(await resolveThemePreview(search, async () => false, themes)).toBe(
      null,
    );
  });
});

describe("activeTheme", () => {
  const siteConfig = resolveSiteConfig({
    site: { theme: { id: "classic", options: { fixture: { marker: "off" } } } },
  });

  it("shows the saved Theme with its saved options without a preview", () => {
    expect(activeTheme(siteConfig, null, themes)).toEqual({
      theme: classic,
      options: {},
    });
  });

  it("shows the previewed Theme with the previewed options", () => {
    expect(
      activeTheme(
        siteConfig,
        { id: "fixture", options: { marker: "on" } },
        themes,
      ),
    ).toEqual({ theme: fixtureTheme, options: { marker: "on" } });
  });
});

describe("preview parameters on navigation", () => {
  const previewing = { themePreview: "fixture", themePreviewOptions: "{}" };

  it("carries the preview to the next page", () => {
    expect(carryThemePreview(previewing, { page: 2 })).toEqual({
      page: 2,
      ...previewing,
    });
    expect(carryThemePreview({ page: 2 }, {})).toEqual({});
  });

  it("drops it when the navigation leaves the preview", () => {
    const next = carryThemePreview(
      previewing,
      withoutThemePreview({ ...previewing, page: 2 }),
    );
    expect(next).toEqual({
      page: 2,
      themePreview: undefined,
      themePreviewOptions: undefined,
    });
  });
});

describe("hasSessionCookie", () => {
  it("finds Better Auth's session cookie only", () => {
    const has = (cookie: string) =>
      hasSessionCookie(new Headers({ Cookie: cookie }));
    expect(has("better-auth.session_token=a.b")).toBe(true);
    expect(has("lang=zh; __Secure-better-auth.session_token=a.b")).toBe(true);
    expect(has("better-auth.session_data=x; lang=zh")).toBe(false);
    expect(has("my-better-auth.session_token=a")).toBe(false);
    expect(hasSessionCookie(new Headers())).toBe(false);
  });
});
