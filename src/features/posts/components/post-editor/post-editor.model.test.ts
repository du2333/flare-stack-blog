import { describe, expect, it } from "vitest";
import {
  contentHasBlobUrl,
  contentStatsFromText,
  persistableTagIds,
  shouldAutogenerateSlug,
} from "./post-editor.model";

describe("persistableTagIds", () => {
  it("drops temporary negative ids", () => {
    expect(persistableTagIds([3, -12, 8, 0, -1])).toEqual([3, 8]);
  });
});

describe("contentHasBlobUrl", () => {
  it("finds blob image urls nested in the document", () => {
    expect(
      contentHasBlobUrl({
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: "blob:https://example.com/1" },
          },
        ],
      }),
    ).toBe(true);
  });

  it("ignores remote images", () => {
    expect(
      contentHasBlobUrl({
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: "https://cdn.example.com/a.png" },
          },
        ],
      }),
    ).toBe(false);
  });
});

describe("contentStatsFromText", () => {
  it("counts cjk characters and english words", () => {
    expect(contentStatsFromText("你好 world")).toEqual({
      chars: 8,
      words: 3,
    });
  });
});

describe("shouldAutogenerateSlug", () => {
  it("generates when the slug is empty", () => {
    expect(shouldAutogenerateSlug("  ", null)).toBe(true);
  });

  it("generates only while the slug still matches the last auto value", () => {
    expect(shouldAutogenerateSlug("hello", "hello")).toBe(true);
    expect(shouldAutogenerateSlug("custom", "hello")).toBe(false);
    expect(shouldAutogenerateSlug("hello", null)).toBe(false);
  });
});
