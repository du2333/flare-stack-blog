import type { JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import {
  applyCodeBlockHighlighting,
  codeBlockHighlightKey,
  snapshotHighlightedHtmlByKey,
} from "./apply-code-block-highlighting";

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
  it("keeps snapshot HTML when language and source text are unchanged", () => {
    const result = applyCodeBlockHighlighting(
      codeDoc([{ language: "ts", text: "const answer = 42;" }]),
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

  it("strips highlighted HTML that was already on the draft", () => {
    const result = applyCodeBlockHighlighting(
      codeDoc([
        { text: "const answer = 42;", highlightedHtml: "<pre>draft</pre>" },
      ]),
      null,
    );

    expect(result?.content?.[0]?.attrs?.highlightedHtml).toBeUndefined();
  });
});

describe("snapshotHighlightedHtmlByKey", () => {
  it("indexes snapshot HTML by language and source text", () => {
    const map = snapshotHighlightedHtmlByKey(
      codeDoc([
        {
          language: "ts",
          text: "const answer = 42;",
          highlightedHtml: "<pre>kept</pre>",
        },
      ]),
    );

    expect(map.get(codeBlockHighlightKey("ts", "const answer = 42;"))).toBe(
      "<pre>kept</pre>",
    );
  });

  it("returns an empty map when there is no snapshot", () => {
    expect(snapshotHighlightedHtmlByKey(null).size).toBe(0);
  });
});
