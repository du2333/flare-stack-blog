import { describe, expect, it } from "vitest";
import {
  getOptimizedImageUrl,
  getOriginalImageUrl,
  getPublicImageSrc,
  hasImageTransformParams,
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

  it("only treats width/quality/fit as transform requests", () => {
    expect(hasImageTransformParams(new URLSearchParams("v=1"))).toBe(false);
    expect(hasImageTransformParams(new URLSearchParams("original=true"))).toBe(
      false,
    );
    expect(hasImageTransformParams(new URLSearchParams("width=800"))).toBe(
      true,
    );
    expect(hasImageTransformParams(new URLSearchParams("quality=80"))).toBe(
      true,
    );
  });
});
