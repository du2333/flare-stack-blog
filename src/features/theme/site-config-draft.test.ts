import { defaultParseSearch } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { readSiteConfigDraft } from "./site-config-draft";
import { themePreviewHref } from "./utils/theme-preview-params";

const DRAFT = {
  bannerImage: "/images/banner.webp",
  bannerFocus: { x: 85, y: 15 },
  avatar: "/images/avatar.webp",
  primaryHue: 120,
  brandMark: "avatar",
  tagline: "Notes from the field",
} as const;

describe("readSiteConfigDraft", () => {
  it("reads every presentation field from the address the Admin opens", () => {
    const search: Record<string, unknown> = defaultParseSearch(
      new URL(themePreviewHref("classic", {}, DRAFT), "https://blog.example")
        .search,
    );
    expect(readSiteConfigDraft(search.themePreviewDraft)).toEqual(DRAFT);
    expect(readSiteConfigDraft(JSON.stringify(DRAFT))).toEqual(DRAFT);
  });

  it("keeps each valid field when others are invalid", () => {
    expect(
      readSiteConfigDraft({
        ...DRAFT,
        bannerFocus: { x: 120, y: 15 },
        primaryHue: 361,
        brandMark: "logo",
        tagline: "x".repeat(81),
      }),
    ).toEqual({
      bannerImage: DRAFT.bannerImage,
      avatar: DRAFT.avatar,
    });
    expect(readSiteConfigDraft({ primaryHue: -1, tagline: "  Hi  " })).toEqual({
      tagline: "Hi",
    });
  });

  it("never takes image data, only keys and URLs of uploaded assets", () => {
    expect(
      readSiteConfigDraft({
        bannerImage: "data:image/png;base64,AAAA",
        avatar: "https://elsewhere.example/a.png",
      }),
    ).toEqual({});
    expect(
      readSiteConfigDraft({ bannerImage: "https://cdn.example/b.webp" }),
    ).toEqual({ bannerImage: "https://cdn.example/b.webp" });
  });

  it("reads no draft from anything but an object", () => {
    for (const value of [undefined, null, "not json", "[1]", 3, ["a"]]) {
      expect(readSiteConfigDraft(value)).toEqual({});
    }
    expect(readSiteConfigDraft({ title: "Not presentation" })).toEqual({});
  });
});
