import { describe, expect, it } from "vitest";
import { codeBlockHighlightKey } from "@/features/posts/utils/apply-code-block-highlighting";
import {
  EDITOR_CODE_HIGHLIGHT_MAX_CHARS,
  EDITOR_CODE_HIGHLIGHT_MAX_LINES,
  codeBlockTextPos,
  isEditorCodeHighlightTooLarge,
  isTextSelectionInsideCodeBlock,
  requestEditorCodeHighlight,
  resolveEditorCodeHighlightHtml,
} from "./highlight";

describe("isEditorCodeHighlightTooLarge", () => {
  it("allows a short snippet", () => {
    expect(isEditorCodeHighlightTooLarge("const answer = 42;\n")).toBe(false);
  });

  it("rejects more than 500 lines", () => {
    const code = Array.from(
      { length: EDITOR_CODE_HIGHLIGHT_MAX_LINES + 1 },
      () => "line",
    ).join("\n");
    expect(isEditorCodeHighlightTooLarge(code)).toBe(true);
  });

  it("rejects more than 50k characters", () => {
    expect(
      isEditorCodeHighlightTooLarge(
        "a".repeat(EDITOR_CODE_HIGHLIGHT_MAX_CHARS + 1),
      ),
    ).toBe(true);
  });
});

describe("resolveEditorCodeHighlightHtml", () => {
  it("reuses snapshot HTML for unchanged language and source", () => {
    const code = "const answer = 42;";
    const snapshotHtml = new Map([
      [codeBlockHighlightKey("ts", code), "<pre>kept</pre>"],
    ]);

    expect(resolveEditorCodeHighlightHtml("ts", code, snapshotHtml)).toBe(
      "<pre>kept</pre>",
    );
  });

  it("ignores snapshot HTML when the block is too large", () => {
    const code = "a".repeat(EDITOR_CODE_HIGHLIGHT_MAX_CHARS + 1);
    const snapshotHtml = new Map([
      [codeBlockHighlightKey("ts", code), "<pre>huge</pre>"],
    ]);

    expect(
      resolveEditorCodeHighlightHtml("ts", code, snapshotHtml),
    ).toBeUndefined();
  });

  it("does not highlight oversized blocks", async () => {
    await expect(
      requestEditorCodeHighlight(
        "ts",
        "a".repeat(EDITOR_CODE_HIGHLIGHT_MAX_CHARS + 1),
      ),
    ).resolves.toBeUndefined();
  });
});

describe("codeBlockTextPos", () => {
  it("places the caret inside the code block at the clicked offset", () => {
    expect(codeBlockTextPos(10, 3, 8)).toBe(14);
  });

  it("clamps the offset to the code length", () => {
    expect(codeBlockTextPos(10, -2, 8)).toBe(11);
    expect(codeBlockTextPos(10, 99, 8)).toBe(19);
  });
});

describe("isTextSelectionInsideCodeBlock", () => {
  it("keeps a caret at the end inside the block after the node grows", () => {
    const blockPos = 10;
    const caret = 15;
    expect(isTextSelectionInsideCodeBlock(caret, caret, blockPos, 5)).toBe(
      false,
    );
    expect(isTextSelectionInsideCodeBlock(caret, caret, blockPos, 6)).toBe(
      true,
    );
  });
});
