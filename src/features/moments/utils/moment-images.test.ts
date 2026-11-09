import { describe, expect, it } from "vitest";
import { momentImageLayout } from "./moment-images";

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
