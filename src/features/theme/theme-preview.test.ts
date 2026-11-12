import { defaultParseSearch } from "@tanstack/react-router";
import { fixtureTheme } from "tests/theme-fixture/theme";
import { describe, expect, it, vi } from "vitest";
import { resolveSiteConfig } from "@/features/config/config.resolve";
import {
  activeTheme,
  previewSiteConfig,
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
const saved = resolveSiteConfig({});

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
      { id: "fixture", options: { marker: "on" }, draft: {} },
    );
    expect(await resolveThemePreview(search, async () => false, themes)).toBe(
      null,
    );
  });

  it("gives an Admin the draft of presentation fields, each valid one only", async () => {
    const draftSearch = searchOf(
      themePreviewHref(
        "fixture",
        {},
        {
          tagline: "Draft line",
          primaryHue: 120,
          bannerFocus: { x: 85, y: 15 },
        },
      ),
    );
    expect(
      await resolveThemePreview(draftSearch, async () => true, themes),
    ).toEqual({
      id: "fixture",
      options: { marker: "on" },
      draft: {
        tagline: "Draft line",
        primaryHue: 120,
        bannerFocus: { x: 85, y: 15 },
      },
    });
    expect(
      await resolveThemePreview(
        {
          ...search,
          themePreviewDraft: JSON.stringify({
            primaryHue: 999,
            brandMark: "none",
          }),
        },
        async () => true,
        themes,
      ),
    ).toMatchObject({ draft: { brandMark: "none" } });
  });

  it("gives anyone else no draft, so the saved Site Config renders", async () => {
    const draftSearch = searchOf(
      themePreviewHref("fixture", {}, { tagline: "Draft line" }),
    );
    const preview = await resolveThemePreview(
      draftSearch,
      async () => false,
      themes,
    );
    expect(preview).toBeNull();
    expect(previewSiteConfig(saved, preview)).toBe(saved);
  });
});

describe("previewSiteConfig", () => {
  it("renders the saved Site Config itself without a draft", () => {
    expect(previewSiteConfig(saved, null)).toBe(saved);
    expect(
      previewSiteConfig(saved, { id: "classic", options: {}, draft: {} }),
    ).toBe(saved);
  });

  it("puts the Admin's draft over the saved fields and keeps the rest", () => {
    const rendered = previewSiteConfig(saved, {
      id: "classic",
      options: {},
      draft: { tagline: "Draft line", primaryHue: 120, brandMark: "none" },
    });
    expect(rendered).toEqual({
      ...saved,
      tagline: "Draft line",
      primaryHue: 120,
      brandMark: "none",
    });
    expect(saved.tagline).not.toBe("Draft line");
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
        { id: "fixture", options: { marker: "on" }, draft: {} },
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
      { ...previewing, themePreviewDraft: { tagline: "Draft" } },
      withoutThemePreview({
        ...previewing,
        themePreviewDraft: { tagline: "Draft" },
        page: 2,
      }),
    );
    expect(next).toStrictEqual({
      page: 2,
      themePreview: undefined,
      themePreviewOptions: undefined,
      themePreviewDraft: undefined,
    });
  });

  it("carries the draft with the Theme", () => {
    const withDraft = { ...previewing, themePreviewDraft: { primaryHue: 120 } };
    expect(carryThemePreview(withDraft, { page: 2 })).toStrictEqual({
      page: 2,
      ...withDraft,
    });
    // A preview without a draft gains none.
    expect(carryThemePreview(previewing, {})).toStrictEqual(previewing);
  });
});

describe("themePreviewHref", () => {
  it("keeps the address of a preview without a draft as it was", () => {
    expect(themePreviewHref("classic", { a: 1 })).toBe(
      "/?themePreview=classic&themePreviewOptions=%7B%22a%22%3A1%7D",
    );
    expect(themePreviewHref("classic", { a: 1 }, {})).toBe(
      themePreviewHref("classic", { a: 1 }),
    );
  });

  it("adds the draft as one more JSON parameter", () => {
    const url = new URL(
      themePreviewHref("classic", {}, { tagline: "Hi", primaryHue: 120 }),
      "https://blog.example",
    );
    expect(JSON.parse(url.searchParams.get("themePreviewDraft")!)).toEqual({
      tagline: "Hi",
      primaryHue: 120,
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
