import type { JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { applyCodeBlockHighlighting } from "./apply-code-block-highlighting";

function codeDoc(
  blocks: Array<{
    language?: string;
    text: string;
    highlightedHtml?: string;
  }>,
  extra?: Array<JSONContent>,
): JSONContent {
  return {
    type: "doc",
    content: [
      ...(extra ?? []),
      ...blocks.map((block) => ({
        type: "codeBlock",
        attrs: {
          language: block.language ?? "ts",
          ...(block.highlightedHtml
            ? { highlightedHtml: block.highlightedHtml }
            : {}),
        },
        content: [{ type: "text", text: block.text }],
      })),
    ],
  };
}

describe("applyCodeBlockHighlighting", () => {
  it("overlays matching request HTML onto the draft and ignores other request nodes", () => {
    const result = applyCodeBlockHighlighting(
      codeDoc(
        [{ text: "const answer = 42;" }],
        [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Server draft" }],
          },
        ],
      ),
      codeDoc(
        [
          {
            text: "const answer = 42;",
            highlightedHtml: "<pre>highlighted</pre>",
          },
        ],
        [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Forged body" }],
          },
        ],
      ),
      null,
    );

    expect(result?.content?.[0]).toMatchObject({
      type: "paragraph",
      content: [{ type: "text", text: "Server draft" }],
    });
    expect(result?.content?.[1]).toMatchObject({
      type: "codeBlock",
      attrs: { highlightedHtml: "<pre>highlighted</pre>" },
    });
  });

  it("keeps snapshot HTML when language and source text are unchanged", () => {
    const result = applyCodeBlockHighlighting(
      codeDoc([{ language: "ts", text: "const answer = 42;" }]),
      null,
      codeDoc([
        {
          language: "ts",
          text: "const answer = 42;",
          highlightedHtml: "<pre>kept</pre>",
        },
      ]),
    );

    expect(result?.content?.[0]?.attrs?.highlightedHtml).toBe(
      "<pre>kept</pre>",
    );
  });

  it("drops snapshot HTML when source text changes", () => {
    const result = applyCodeBlockHighlighting(
      codeDoc([{ language: "ts", text: "const answer = 43;" }]),
      null,
      codeDoc([
        {
          language: "ts",
          text: "const answer = 42;",
          highlightedHtml: "<pre>stale</pre>",
        },
      ]),
    );

    expect(result?.content?.[0]?.attrs?.highlightedHtml).toBeUndefined();
  });

  it("prefers request HTML over snapshot HTML for the same block", () => {
    const result = applyCodeBlockHighlighting(
      codeDoc([{ text: "const answer = 42;" }]),
      codeDoc([
        { text: "const answer = 42;", highlightedHtml: "<pre>fresh</pre>" },
      ]),
      codeDoc([
        { text: "const answer = 42;", highlightedHtml: "<pre>old</pre>" },
      ]),
    );

    expect(result?.content?.[0]?.attrs?.highlightedHtml).toBe(
      "<pre>fresh</pre>",
    );
  });

  it("strips highlighted HTML that was already on the draft", () => {
    const result = applyCodeBlockHighlighting(
      codeDoc([
        { text: "const answer = 42;", highlightedHtml: "<pre>draft</pre>" },
      ]),
      null,
      null,
    );

    expect(result?.content?.[0]?.attrs?.highlightedHtml).toBeUndefined();
  });
});
