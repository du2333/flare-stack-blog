import type { JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { jsonContentHasType } from "./content";

const doc = (...content: Array<JSONContent>): JSONContent => ({
  type: "doc",
  content,
});

describe("jsonContentHasType", () => {
  it("returns false for empty content", () => {
    expect(jsonContentHasType(null, "codeBlock")).toBe(false);
    expect(jsonContentHasType(doc(), "codeBlock")).toBe(false);
  });

  it("finds nested code and math nodes", () => {
    const content = doc(
      {
        type: "paragraph",
        content: [{ type: "inlineMath", attrs: { latex: "x" } }],
      },
      {
        type: "codeBlock",
        attrs: { language: "ts" },
        content: [{ type: "text", text: "const n = 1;" }],
      },
    );

    expect(jsonContentHasType(content, "codeBlock")).toBe(true);
    expect(jsonContentHasType(content, ["inlineMath", "blockMath"])).toBe(true);
    expect(jsonContentHasType(content, "blockMath")).toBe(false);
    expect(jsonContentHasType(content, "image")).toBe(false);
  });
});
