import { describe, expect, it } from "vitest";
import { splitMediaName } from "./media-name";

describe("splitMediaName", () => {
  it("keeps the extension and the last characters of a long name", () => {
    expect(splitMediaName("Image_2026-08-22_17-45-03.png")).toEqual({
      head: "Image_2026-08-22_17-4",
      tail: "5-03.png",
    });
  });

  it("returns a short name whole as the tail", () => {
    expect(splitMediaName("a.png")).toEqual({ head: "", tail: "a.png" });
    expect(splitMediaName("logo.svg")).toEqual({ head: "", tail: "logo.svg" });
  });

  it("splits a name without an extension", () => {
    expect(splitMediaName("screenshot-without-extension")).toEqual({
      head: "screenshot-without-exten",
      tail: "sion",
    });
  });

  it("counts Chinese characters, not bytes", () => {
    expect(splitMediaName("旅行照片整理第三批最终版.jpg")).toEqual({
      head: "旅行照片整理第三",
      tail: "批最终版.jpg",
    });
    expect(splitMediaName("封面.jpg")).toEqual({ head: "", tail: "封面.jpg" });
  });

  it("does not cut an emoji sequence in two", () => {
    const family = "👨‍👩‍👧";
    expect(splitMediaName(`holiday${family}${family}.png`)).toEqual({
      head: "holid",
      tail: `ay${family}${family}.png`,
    });
  });

  it("takes only the last extension", () => {
    expect(splitMediaName("archive.backup.final.webp")).toEqual({
      head: "archive.backup.f",
      tail: "inal.webp",
    });
  });

  it("treats a dot without a real extension as part of the name", () => {
    expect(splitMediaName(".png")).toEqual({ head: "", tail: ".png" });
    expect(splitMediaName("trip. summer holiday")).toEqual({
      head: "trip. summer hol",
      tail: "iday",
    });
    expect(splitMediaName("ends-with-a-dot.")).toEqual({
      head: "ends-with-a-",
      tail: "dot.",
    });
  });
});
