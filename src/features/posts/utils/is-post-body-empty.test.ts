import type { JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { isPostBodyEmpty } from "./is-post-body-empty";

const doc = (...content: Array<JSONContent>): JSONContent => ({
  type: "doc",
  content,
});

describe("isPostBodyEmpty", () => {
  it("treats null as empty", () => {
    expect(isPostBodyEmpty(null)).toBe(true);
  });

  it("treats an empty paragraph doc as empty", () => {
    expect(isPostBodyEmpty(doc({ type: "paragraph" }))).toBe(true);
  });

  it("treats whitespace-only text as empty", () => {
    expect(
      isPostBodyEmpty(
        doc({ type: "paragraph", content: [{ type: "text", text: "  \n" }] }),
      ),
    ).toBe(true);
  });

  it("treats an empty list as empty", () => {
    expect(
      isPostBodyEmpty(
        doc({
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph" }],
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("treats titled text as not empty", () => {
    expect(
      isPostBodyEmpty(
        doc({
          type: "paragraph",
          content: [{ type: "text", text: "hello" }],
        }),
      ),
    ).toBe(false);
  });

  it("treats image, codeBlock, table, math, and horizontalRule as not empty", () => {
    expect(isPostBodyEmpty(doc({ type: "image", attrs: { src: "x" } }))).toBe(
      false,
    );
    expect(isPostBodyEmpty(doc({ type: "codeBlock" }))).toBe(false);
    expect(isPostBodyEmpty(doc({ type: "table" }))).toBe(false);
    expect(isPostBodyEmpty(doc({ type: "inlineMath" }))).toBe(false);
    expect(isPostBodyEmpty(doc({ type: "blockMath" }))).toBe(false);
    expect(isPostBodyEmpty(doc({ type: "horizontalRule" }))).toBe(false);
  });
});
