import { describe, expect, it } from "vitest";
import { momentImageLayout, singleImageBox } from "./moment-images";

describe("singleImageBox", () => {
  it("reserves a landscape box capped by height and width", () => {
    expect(singleImageBox(1600, 800, "24rem")).toEqual({
      style: {
        aspectRatio: "1600 / 800",
        width: "min(100%, calc(24rem * 1600 / 800), 1600px)",
      },
      known: true,
    });
  });

  it("reserves portrait and square boxes", () => {
    expect(singleImageBox(600, 900, "11rem").style).toEqual({
      aspectRatio: "600 / 900",
      width: "min(100%, calc(11rem * 600 / 900), 600px)",
    });
    expect(singleImageBox(500, 500, "24rem").style.aspectRatio).toBe(
      "500 / 500",
    );
  });

  it("never upscales a small image past its natural width", () => {
    expect(singleImageBox(300, 200, "24rem").style).toEqual({
      aspectRatio: "300 / 200",
      width: "min(100%, calc(24rem * 300 / 200), 300px)",
    });
  });

  it("falls back to a 4:3 box for unknown sizes", () => {
    for (const [w, h] of [
      [null, null],
      [undefined, 100],
      [0, 0],
    ] as const) {
      expect(singleImageBox(w, h, "24rem")).toEqual({
        style: { aspectRatio: "4 / 3", width: "100%" },
        known: false,
      });
    }
  });
});

describe("momentImageLayout", () => {
  it("shows one image large", () => {
    expect(momentImageLayout(1)).toEqual({ columns: 1, shown: 1, more: 0 });
  });

  it("uses two columns for two to four images", () => {
    for (const count of [2, 3, 4]) {
      expect(momentImageLayout(count)).toEqual({
        columns: 2,
        shown: count,
        more: 0,
      });
    }
  });

  it("uses three columns for five to nine images", () => {
    for (const count of [5, 6, 9]) {
      expect(momentImageLayout(count)).toEqual({
        columns: 3,
        shown: count,
        more: 0,
      });
    }
  });

  it("counts the images past nine", () => {
    expect(momentImageLayout(10)).toEqual({ columns: 3, shown: 9, more: 1 });
    expect(momentImageLayout(50)).toEqual({ columns: 3, shown: 9, more: 41 });
  });
});
