import { describe, expect, it } from "vitest";
import { outlineOf, textStats } from "./post-editor-stats";

describe("textStats", () => {
  it("counts each Chinese character and each spaced word as one", () => {
    expect(textStats("用 Cache API 加速网站").count).toBe(1 + 2 + 4);
  });

  it("keeps a word with an apostrophe, a hyphen or a dot in one piece", () => {
    expect(textStats("don't re-run v1.2").count).toBe(3);
  });

  it("has nothing to read in an empty text", () => {
    expect(textStats("  \n ")).toEqual({ count: 0, minutes: 0 });
  });

  it("takes at least a minute once there is text", () => {
    expect(textStats("好").minutes).toBe(1);
  });

  it("reads Chinese at 400 characters and spaced words at 220 a minute", () => {
    expect(textStats("字".repeat(1200)).minutes).toBe(3);
    expect(textStats("word ".repeat(440)).minutes).toBe(2);
  });
});

describe("outlineOf", () => {
  const node = (name: string, text: string, level?: number) => ({
    type: { name },
    attrs: level ? { level } : {},
    textContent: text,
  });
  const doc = (nodes: Array<ReturnType<typeof node>>) => ({
    descendants: (
      visit: (n: ReturnType<typeof node>, pos: number) => boolean | void,
    ) => nodes.forEach((n, index) => visit(n, index * 10)),
  });

  it("lists headings with their level and position, in order", () => {
    expect(
      outlineOf(
        doc([
          node("paragraph", "开头"),
          node("heading", "起因", 2),
          node("heading", " 细节 ", 3),
        ]),
      ),
    ).toEqual([
      { pos: 10, level: 2, text: "起因" },
      { pos: 20, level: 3, text: "细节" },
    ]);
  });

  it("leaves out a heading without text", () => {
    expect(outlineOf(doc([node("heading", "  ", 2)]))).toEqual([]);
  });
});
