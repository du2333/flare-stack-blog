import { describe, expect, it } from "vitest";
import { highlightSnapshotContent } from "./highlight-code-blocks";

describe("highlightSnapshotContent", () => {
  it("reuses snapshot HTML and highlights missing blocks", async () => {
    const result = await highlightSnapshotContent(
      {
        type: "doc",
        content: [
          {
            type: "codeBlock",
            attrs: { language: "ts" },
            content: [{ type: "text", text: "const x = 1;" }],
          },
          {
            type: "codeBlock",
            attrs: { language: "ts" },
            content: [{ type: "text", text: "const y = 2;" }],
          },
        ],
      },
      {
        type: "doc",
        content: [
          {
            type: "codeBlock",
            attrs: {
              language: "ts",
              highlightedHtml: "<pre>kept</pre>",
            },
            content: [{ type: "text", text: "const x = 1;" }],
          },
        ],
      },
    );

    expect(result?.content?.[0]?.attrs?.highlightedHtml).toBe(
      "<pre>kept</pre>",
    );
    expect(result?.content?.[1]?.attrs?.highlightedHtml).toEqual(
      expect.stringContaining("shiki"),
    );
  });
});
