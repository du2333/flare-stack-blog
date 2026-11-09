import { describe, expect, it } from "vitest";
import {
  cleanMediaName,
  getOptimizedImageUrl,
  getOriginalImageUrl,
  getPublicImageSrc,
  getPublicImageSrcSet,
  getTransformSourceUrl,
  importedMediaName,
  isSameImageType,
  MEDIA_NAME_MAX_LENGTH,
  mediaUsageOf,
  parseImageTransform,
  PUBLIC_IMAGE_WIDTH,
} from "./media.utils";

describe("image URLs", () => {
  it("keeps admin originals off the transform query", () => {
    expect(getOriginalImageUrl("abc.png")).toBe("/images/abc.png");
  });

  it("opts into a public transform with quality and width", () => {
    expect(getOptimizedImageUrl("abc.png", PUBLIC_IMAGE_WIDTH.cover)).toBe(
      "/images/abc.png?quality=80&width=800",
    );
  });

  it("does not transform gifs", () => {
    expect(getOptimizedImageUrl("loop.gif", 800)).toBe(
      "/images/loop.gif?original=true",
    );
  });

  it("rewrites public src from a stored original and keeps cache-busting", () => {
    expect(
      getPublicImageSrc(
        "/images/home-bg.webp?v=177",
        PUBLIC_IMAGE_WIDTH.banner,
      ),
    ).toBe("/images/home-bg.webp?quality=80&width=1600&v=177");
  });

  it("leaves external src unchanged", () => {
    expect(getPublicImageSrc("https://cdn.example/pic.png", 800)).toBe(
      "https://cdn.example/pic.png",
    );
  });

  it.each([
    ["width=400&quality=80", 400],
    ["quality=80&width=800", 800],
    ["width=1600&quality=80&v=177", 1600],
    ["width=2560", 2560],
  ])("transforms the allowed request %s", (query, width) => {
    expect(
      parseImageTransform(new URLSearchParams(query), "image/avif,image/webp"),
    ).toEqual({ width, quality: 80, format: "avif" });
  });

  it.each([
    "",
    "v=1",
    "original=true",
    "quality=80",
    "width=799&quality=80",
    "width=800&quality=90",
    "width=800&height=600",
    "width=800&fit=cover",
    "width=800&original=true",
  ])("serves the original for %s", (query) => {
    expect(parseImageTransform(new URLSearchParams(query), "")).toBeNull();
  });

  it("negotiates webp when avif is not accepted", () => {
    expect(
      parseImageTransform(new URLSearchParams("width=800"), "image/webp"),
    ).toEqual({ width: 800, quality: 80, format: "webp" });
  });

  it("offers a 1x and 2x source set for public images", () => {
    expect(getPublicImageSrcSet("/images/abc.png?v=3", [800, 1600])).toBe(
      "/images/abc.png?quality=80&width=800&v=3 800w, /images/abc.png?quality=80&width=1600&v=3 1600w",
    );
    expect(
      getPublicImageSrcSet("/images/loop.gif", [800, 1600]),
    ).toBeUndefined();
    expect(
      getPublicImageSrcSet("https://cdn.example/pic.png", [800, 1600]),
    ).toBeUndefined();
  });

  it("fetches the transform source at the stored file's version", () => {
    expect(
      getTransformSourceUrl(
        new URL(
          "https://blog.example/images/asset/themes/fuwari/home-bg.webp?quality=80&width=1600&v=177",
        ),
        "asset/themes/fuwari/home-bg.webp",
        "etag-1",
      ),
    ).toBe(
      "https://blog.example/images/asset/themes/fuwari/home-bg.webp?original=true&v=etag-1",
    );
    expect(
      getTransformSourceUrl(
        new URL("https://blog.example/images/abc.png?quality=80&width=800"),
        "abc.png",
        "etag-2",
      ),
    ).toBe("https://blog.example/images/abc.png?original=true&v=etag-2");
  });
});

describe("cleanMediaName", () => {
  it("drops control and format characters and trims", () => {
    expect(cleanMediaName("  a\u202Eb\u0000c\u200B.png \n")).toBe("abc.png");
    expect(cleanMediaName("a\tb")).toBe("a b");
  });

  it("keeps an emoji joiner and non-ASCII letters", () => {
    expect(cleanMediaName("👩\u200D💻 封面.png")).toBe("👩\u200D💻 封面.png");
  });

  it("is empty when nothing is left", () => {
    expect(cleanMediaName(" \u200B\u202E\n")).toBe("");
  });

  it("cuts a long name to the limit and keeps its extension", () => {
    const cut = cleanMediaName(`${"n".repeat(500)}.webp`);
    expect(cut).toHaveLength(MEDIA_NAME_MAX_LENGTH);
    expect(cut.endsWith("n.webp")).toBe(true);
    expect(cleanMediaName("😀".repeat(300)).length).toBeLessThanOrEqual(
      MEDIA_NAME_MAX_LENGTH,
    );
    expect(cleanMediaName("😀".repeat(300))).not.toMatch(/[\uD800-\uDBFF]$/);
  });
});

describe("importedMediaName", () => {
  it.each([
    ["sunset.png", "image/png", "sunset.png"],
    ["12345", "image/png", "12345.png"],
    ["photo.jpg", "image/png", "photo.png"],
    ["photo.jpeg", "image/jpeg", "photo.jpeg"],
    ["photo.JPG", "image/jpeg", "photo.JPG"],
    ["photo.webp", "image/jpg", "photo.jpg"],
    ["logo", "image/svg+xml", "logo.svg"],
    ["v1.2", "image/gif", "v1.2.gif"],
    ["", "image/webp", "image.webp"],
    [".png", "image/png", "image.png"],
    [".jpg", "image/png", "image.png"],
    ["\u200B", "image/png", "image.png"],
  ])("names %j as a %s: %s", (name, mimeType, expected) => {
    expect(importedMediaName(name, mimeType)).toBe(expected);
  });

  it("stays within the limit when it adds an extension", () => {
    const name = importedMediaName("n".repeat(255), "image/png");
    expect(name).toHaveLength(MEDIA_NAME_MAX_LENGTH);
    expect(name.endsWith(".png")).toBe(true);
  });
});

describe("isSameImageType", () => {
  it("treats image/jpg as image/jpeg and ignores case and parameters", () => {
    expect(isSameImageType("image/jpg", "image/jpeg")).toBe(true);
    expect(isSameImageType("IMAGE/PNG; charset=x", "image/png")).toBe(true);
    expect(isSameImageType("image/png", "image/svg+xml")).toBe(false);
    expect(isSameImageType("image/gif", "image/webp")).toBe(false);
  });
});

describe("mediaUsageOf", () => {
  it("tells current use from use only in Post Revisions", () => {
    expect(
      mediaUsageOf({ postCount: 2, revisionOnlyPostCount: 1, momentCount: 0 }),
    ).toBe("current");
    expect(
      mediaUsageOf({ postCount: 0, revisionOnlyPostCount: 1, momentCount: 0 }),
    ).toBe("revisions-only");
    expect(
      mediaUsageOf({ postCount: 0, revisionOnlyPostCount: 0, momentCount: 0 }),
    ).toBe("none");
  });

  it("counts an image a Moment shows as in use", () => {
    expect(
      mediaUsageOf({ postCount: 0, revisionOnlyPostCount: 1, momentCount: 1 }),
    ).toBe("current");
  });
});
