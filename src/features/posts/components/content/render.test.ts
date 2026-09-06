import type { JSONContent } from "@tiptap/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderReact } from "./render";

function cell(
  type: "tableHeader" | "tableCell",
  text: string,
  colwidth: Array<number> | null,
): JSONContent {
  return {
    type,
    attrs: { colspan: 1, rowspan: 1, colwidth },
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

describe("renderReact tables", () => {
  it("renders every column and ignores stored pixel colwidth", () => {
    const html = renderToStaticMarkup(
      renderReact({
        type: "doc",
        content: [
          {
            type: "table",
            content: [
              {
                type: "tableRow",
                content: [
                  cell("tableHeader", "A", [471]),
                  cell("tableHeader", "B", [451]),
                  cell("tableHeader", "C", null),
                ],
              },
            ],
          },
        ],
      }),
    );

    expect(html).toContain("fuwari-table-scroll");
    expect(html).toContain("<thead");
    expect(html.match(/<th\b/g)?.length).toBe(3);
    expect(html).toContain(">A</");
    expect(html).toContain(">B</");
    expect(html).toContain(">C</");
    expect(html).not.toContain("471");
    expect(html).not.toContain("451");
    expect(html).not.toContain("width:");
  });
});
