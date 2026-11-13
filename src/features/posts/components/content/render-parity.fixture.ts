import type { JSONContent } from "@tiptap/react";

const text = (value: string, marks?: JSONContent["marks"]): JSONContent =>
  marks ? { type: "text", text: value, marks } : { type: "text", text: value };

const paragraph = (...content: Array<JSONContent>): JSONContent => ({
  type: "paragraph",
  content,
});

const cell = (
  type: "tableHeader" | "tableCell",
  value: string,
  attrs?: Record<string, unknown>,
): JSONContent => ({
  type,
  ...(attrs ? { attrs } : {}),
  content: [paragraph(text(value))],
});

const longCode = Array.from(
  { length: 40 },
  (_, line) => `const line${line} = ${line};`,
).join("\n");

/**
 * A Post body with every node type, mark and attribute variation the editor
 * schema allows, as `publicPostContent` hands it to the public page, plus
 * bodies that bend the rules (missing attributes, unsorted marks, spans that
 * do not add up). Both renderers must turn it into the same HTML.
 */
export const PARITY_FIXTURE: JSONContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [text("Level one")] },
    { type: "heading", attrs: { level: 2 }, content: [text("Introduction")] },
    { type: "heading", attrs: { level: 2 }, content: [text("Introduction")] },
    {
      type: "heading",
      attrs: { level: 3, id: "stale-id" },
      content: [text("Marked "), text("heading", [{ type: "bold" }])],
    },
    { type: "heading", attrs: { level: 4 }, content: [text("Level four")] },
    { type: "heading", attrs: { level: 6 }, content: [text("Level six")] },
    { type: "heading", content: [text("No level")] },
    { type: "heading", attrs: { level: 3 } },
    { type: "paragraph" },
    paragraph(
      text("plain "),
      text("bold", [{ type: "bold" }]),
      text(" "),
      text("italic", [{ type: "italic" }]),
      text(" "),
      text("strike", [{ type: "strike" }]),
      text(" "),
      text("underline", [{ type: "underline" }]),
      text(" "),
      text("code", [{ type: "code" }]),
      text(' & <escaped> "text"'),
    ),
    paragraph(
      text("every mark", [
        { type: "underline" },
        { type: "italic" },
        { type: "strike" },
        { type: "bold" },
        { type: "link", attrs: { href: "https://example.com/all" } },
      ]),
      text(" bold code", [{ type: "code" }, { type: "bold" }]),
      text("italic bold", [{ type: "italic" }, { type: "bold" }]),
    ),
    paragraph(
      text("link", [
        {
          type: "link",
          attrs: { href: "https://example.com/a", title: "A title" },
        },
      ]),
      text(" "),
      text("no title", [
        { type: "link", attrs: { href: "https://example.com/b", title: null } },
      ]),
      text(" "),
      text("relative", [{ type: "link", attrs: { href: "/post/other" } }]),
      text(" "),
      text("mail", [{ type: "link", attrs: { href: "mailto:a@example.com" } }]),
      text(" "),
      text("unsafe", [
        { type: "link", attrs: { href: "javascript:alert(1)" } },
      ]),
      text(" "),
      text("no attrs", [{ type: "link" }]),
      text(" "),
      text("bold link", [
        { type: "bold" },
        { type: "link", attrs: { href: "https://example.com/c" } },
      ]),
    ),
    paragraph(
      text("line one"),
      { type: "hardBreak" },
      text("line two"),
      { type: "hardBreak", marks: [{ type: "bold" }] },
      text("line three"),
    ),
    {
      type: "blockquote",
      content: [
        paragraph(text("A quote")),
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [paragraph(text("in a quote"))] },
          ],
        },
      ],
    },
    { type: "horizontalRule" },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            paragraph(text("first")),
            {
              type: "orderedList",
              attrs: { start: 1, type: null },
              content: [
                { type: "listItem", content: [paragraph(text("nested one"))] },
                {
                  type: "listItem",
                  content: [
                    paragraph(text("nested two")),
                    {
                      type: "bulletList",
                      content: [
                        {
                          type: "listItem",
                          content: [paragraph(text("deepest"))],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        { type: "listItem", content: [paragraph(text("second"))] },
      ],
    },
    {
      type: "orderedList",
      attrs: { start: 3, type: null },
      content: [{ type: "listItem", content: [paragraph(text("three"))] }],
    },
    {
      type: "orderedList",
      attrs: { start: 1, type: "a" },
      content: [{ type: "listItem", content: [paragraph(text("a"))] }],
    },
    {
      type: "orderedList",
      attrs: { start: 0, type: "1" },
      content: [{ type: "listItem", content: [paragraph(text("zero"))] }],
    },
    {
      type: "orderedList",
      attrs: { start: null },
      content: [{ type: "listItem", content: [paragraph(text("null"))] }],
    },
    {
      type: "orderedList",
      content: [{ type: "listItem", content: [paragraph(text("bare"))] }],
    },
    {
      type: "codeBlock",
      attrs: {
        language: "ts",
        highlightedHtml:
          '<pre class="shiki"><code><span class="line">const a = 1;</span></code></pre>',
      },
      content: [text("const a = 1;")],
    },
    {
      type: "codeBlock",
      attrs: { language: "python", highlightedHtml: null },
      content: [text("print('<hi>')")],
    },
    {
      type: "codeBlock",
      attrs: { language: null },
      content: [text("no language")],
    },
    {
      type: "codeBlock",
      attrs: { language: "text" },
      content: [text("plain")],
    },
    { type: "codeBlock", attrs: { language: "" }, content: [text("empty")] },
    { type: "codeBlock", content: [text("no attrs")] },
    { type: "codeBlock", attrs: { language: "ts" } },
    {
      type: "codeBlock",
      attrs: { language: "js" },
      content: [text("const a = 1;\n"), text("const b = 2;")],
    },
    { type: "codeBlock", attrs: { language: "ts" }, content: [text(longCode)] },
    {
      type: "codeBlock",
      attrs: { language: "mermaid" },
      content: [text("flowchart LR\n  A --> B")],
    },
    {
      type: "codeBlock",
      attrs: {
        language: "mermaid",
        highlightedHtml:
          '<pre class="shiki"><code><span class="line">graph TD</span></code></pre>',
      },
      content: [text("graph TD")],
    },
    {
      type: "image",
      attrs: {
        src: "https://cdn.example.com/a.jpg",
        alt: "A caption",
        title: "A title",
        width: 1200,
        height: 800,
        uploadId: null,
      },
    },
    {
      type: "image",
      attrs: { src: "/images/b.png", alt: null, width: "640", height: "480px" },
    },
    {
      type: "image",
      attrs: { src: "/images/c.png", alt: "null", width: "50%", height: 0 },
    },
    { type: "image", attrs: { src: "/images/d.png", alt: "" } },
    { type: "image", attrs: { src: "https://cdn.example.com/e.webp" } },
    {
      type: "video",
      attrs: {
        provider: "bilibili",
        videoId: "BV1xx411c7mD",
        page: null,
        start: null,
        title: "A Bilibili video",
        cover: "https://i0.hdslb.com/bfs/archive/cover.jpg",
        duration: 3725,
        src: null,
        pageUrl: null,
      },
    },
    {
      type: "video",
      attrs: { provider: "bilibili", videoId: "av170001", page: 2, start: 90 },
    },
    {
      type: "video",
      attrs: {
        provider: "youtube",
        videoId: "dQw4w9WgXcQ",
        page: null,
        start: 42,
        title: "A YouTube video",
        cover: null,
        duration: 212,
      },
    },
    {
      type: "video",
      attrs: {
        provider: "direct",
        videoId: null,
        src: "https://video.example.com/clip.mp4",
        pageUrl: "https://video.example.com/watch/1",
        title: "A clip",
        cover: "https://video.example.com/poster.jpg",
        duration: 95,
      },
    },
    {
      type: "video",
      attrs: { provider: "direct", src: "https://video.example.com/bare.mp4" },
    },
    {
      type: "video",
      attrs: { provider: "direct", src: "http://video.example.com/x.mp4" },
    },
    { type: "video", attrs: { provider: "vimeo", videoId: "123" } },
    { type: "video" },
    paragraph(
      text("Inline "),
      { type: "inlineMath", attrs: { latex: "x^2 + y^2" } },
      text(" and empty "),
      { type: "inlineMath", attrs: { latex: "" } },
      text(" and bare "),
      { type: "inlineMath" },
      text(" and marked "),
      { type: "inlineMath", attrs: { latex: "a" }, marks: [{ type: "bold" }] },
    ),
    { type: "blockMath", attrs: { latex: "E = mc^2" } },
    { type: "blockMath", attrs: { latex: "\\frac{a}{b" } },
    { type: "blockMath" },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            cell("tableHeader", "Name", {
              colspan: 1,
              rowspan: 1,
              colwidth: [120],
              align: "left",
            }),
            cell("tableHeader", "Merged header", {
              colspan: 2,
              rowspan: 1,
              colwidth: [200, null],
              align: "center",
            }),
          ],
        },
        {
          type: "tableRow",
          content: [
            cell("tableHeader", "Row header", {
              colspan: 1,
              rowspan: 2,
              colwidth: null,
              align: null,
            }),
            cell("tableCell", "Right", {
              colspan: 1,
              rowspan: 1,
              colwidth: null,
              align: "right",
            }),
            cell("tableCell", "Bogus align", {
              colspan: 1,
              rowspan: 1,
              colwidth: [0],
              align: "justify",
            }),
          ],
        },
        {
          type: "tableRow",
          content: [
            cell("tableCell", "Two wide", {
              colspan: 2,
              rowspan: 1,
              colwidth: null,
              align: null,
            }),
          ],
        },
      ],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [cell("tableCell", "no header"), cell("tableCell", "b")],
        },
        {
          type: "tableRow",
          content: [cell("tableHeader", "late header"), cell("tableCell", "c")],
        },
      ],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            cell("tableHeader", "only", { colwidth: [300] }),
            cell("tableHeader", "headers", { colwidth: [100] }),
          ],
        },
        {
          type: "tableRow",
          content: [cell("tableHeader", "x"), cell("tableHeader", "y")],
        },
      ],
    },
    {
      // Spans that do not add up: a row too short, one too long and a cell
      // reaching below the table.
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            cell("tableHeader", "a", { colwidth: [80] }),
            cell("tableHeader", "b", { rowspan: 3, colwidth: [160] }),
          ],
        },
        { type: "tableRow", content: [cell("tableCell", "short")] },
        {
          type: "tableRow",
          content: [
            cell("tableCell", "c"),
            cell("tableCell", "d", { colwidth: [40] }),
            cell("tableCell", "e", { colspan: 2, colwidth: [null, 90] }),
          ],
        },
      ],
    },
    {
      type: "table",
      content: [
        { type: "tableRow" },
        { type: "tableRow", content: [cell("tableCell", "after empty row")] },
      ],
    },
    paragraph(text("The end.")),
  ],
};
