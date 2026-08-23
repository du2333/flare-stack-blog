import { describe, expect, it } from "vitest";
import {
  clampHeadingLevel,
  generateTableOfContents,
  uniqueHeadingId,
  withUniqueHeadingIds,
} from "./toc";

describe("clampHeadingLevel", () => {
  it("maps h1 and invalid values to h2", () => {
    expect(clampHeadingLevel(1)).toBe(2);
    expect(clampHeadingLevel(0)).toBe(2);
    expect(clampHeadingLevel("h1")).toBe(2);
  });

  it("keeps h2-h4 and folds deeper headings into h4", () => {
    expect(clampHeadingLevel(2)).toBe(2);
    expect(clampHeadingLevel(3)).toBe(3);
    expect(clampHeadingLevel(4)).toBe(4);
    expect(clampHeadingLevel(6)).toBe(4);
  });
});

describe("uniqueHeadingId", () => {
  it("suffixes duplicates", () => {
    const used = new Set<string>();
    expect(uniqueHeadingId("Hello", used)).toBe("hello");
    expect(uniqueHeadingId("Hello", used)).toBe("hello-2");
    expect(uniqueHeadingId("Hello", used)).toBe("hello-3");
  });
});

describe("generateTableOfContents", () => {
  it("clamps h1 and uniquifies duplicate titles", () => {
    const toc = generateTableOfContents({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Intro" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Intro" }],
        },
      ],
    });

    expect(toc).toEqual([
      { id: "intro", text: "Intro", level: 2 },
      { id: "intro-2", text: "Intro", level: 2 },
    ]);
  });
});

describe("withUniqueHeadingIds", () => {
  it("writes unique ids and clamped levels onto a clone", () => {
    const input = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "A" }],
        },
      ],
    };
    const result = withUniqueHeadingIds(input);
    expect(input.content?.[0]?.attrs).toEqual({ level: 1 });
    expect(result.content?.[0]?.attrs).toMatchObject({ level: 2, id: "a" });
  });
});
