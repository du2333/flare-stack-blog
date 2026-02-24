import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import {
  jsonContentToMarkdown,
  makeExportImageRewriter,
} from "@/features/import-export/utils/markdown-serializer";
import { markdownToJsonContent } from "@/features/import-export/utils/markdown-parser";

function doc(...content: Array<JSONContent>): JSONContent {
  return { type: "doc", content };
}

function paragraph(...content: Array<JSONContent>): JSONContent {
  return { type: "paragraph", content };
}

function text(
  value: string,
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>,
): JSONContent {
  return { type: "text", text: value, ...(marks ? { marks } : {}) };
}

function heading(level: number, ...content: Array<JSONContent>): JSONContent {
  return { type: "heading", attrs: { level }, content };
}

describe("jsonContentToMarkdown", () => {
  it("should convert heading", () => {
    const result = jsonContentToMarkdown(doc(heading(1, text("Title"))));
    expect(result.trim()).toBe("# Title");
  });

  it("should convert multiple heading levels", () => {
    const result = jsonContentToMarkdown(
      doc(
        heading(1, text("H1")),
        heading(2, text("H2")),
        heading(3, text("H3")),
      ),
    );
    expect(result).toContain("# H1");
    expect(result).toContain("## H2");
    expect(result).toContain("### H3");
  });

  it("should convert paragraph with bold", () => {
    const result = jsonContentToMarkdown(
      doc(paragraph(text("hello "), text("bold", [{ type: "bold" }]))),
    );
    expect(result).toContain("hello **bold**");
  });

  it("should convert paragraph with italic", () => {
    const result = jsonContentToMarkdown(
      doc(paragraph(text("hello "), text("italic", [{ type: "italic" }]))),
    );
    expect(result).toContain("hello _italic_");
  });

  it("should convert inline code", () => {
    const result = jsonContentToMarkdown(
      doc(paragraph(text("run "), text("npm install", [{ type: "code" }]))),
    );
    expect(result).toContain("run `npm install`");
  });

  it("should convert strikethrough", () => {
    const result = jsonContentToMarkdown(
      doc(paragraph(text("deleted", [{ type: "strike" }]))),
    );
    expect(result).toContain("~~deleted~~");
  });

  it("should convert link", () => {
    const result = jsonContentToMarkdown(
      doc(
        paragraph(
          text("click "),
          text("here", [
            { type: "link", attrs: { href: "https://example.com" } },
          ]),
        ),
      ),
    );
    expect(result).toContain("[here](https://example.com)");
  });

  it("should convert code block with language", () => {
    const result = jsonContentToMarkdown(
      doc({
        type: "codeBlock",
        attrs: { language: "js" },
        content: [text("console.log('hi');")],
      }),
    );
    expect(result).toContain("```js");
    expect(result).toContain("console.log('hi');");
    expect(result).toContain("```");
  });

  it("should convert blockquote", () => {
    const result = jsonContentToMarkdown(
      doc({ type: "blockquote", content: [paragraph(text("quoted text"))] }),
    );
    expect(result).toContain("> quoted text");
  });

  it("should convert bullet list", () => {
    const result = jsonContentToMarkdown(
      doc({
        type: "bulletList",
        content: [
          { type: "listItem", content: [paragraph(text("item 1"))] },
          { type: "listItem", content: [paragraph(text("item 2"))] },
        ],
      }),
    );
    expect(result).toContain("- item 1");
    expect(result).toContain("- item 2");
  });

  it("should convert ordered list", () => {
    const result = jsonContentToMarkdown(
      doc({
        type: "orderedList",
        attrs: { start: 1 },
        content: [
          { type: "listItem", content: [paragraph(text("first"))] },
          { type: "listItem", content: [paragraph(text("second"))] },
        ],
      }),
    );
    expect(result).toContain("1. first");
    expect(result).toContain("2. second");
  });

  it("should convert image", () => {
    const result = jsonContentToMarkdown(
      doc({
        type: "image",
        attrs: { src: "https://example.com/img.png", alt: "photo" },
      }),
    );
    expect(result).toContain("![photo](https://example.com/img.png)");
  });

  it("should convert horizontal rule", () => {
    const result = jsonContentToMarkdown(
      doc(
        paragraph(text("before")),
        { type: "horizontalRule" },
        paragraph(text("after")),
      ),
    );
    expect(result).toContain("---");
  });

  it("should convert table", () => {
    const result = jsonContentToMarkdown(
      doc({
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableHeader",
                content: [paragraph(text("Name"))],
              },
              {
                type: "tableHeader",
                content: [paragraph(text("Age"))],
              },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [paragraph(text("Alice"))] },
              { type: "tableCell", content: [paragraph(text("30"))] },
            ],
          },
        ],
      }),
    );
    expect(result).toContain("| Name | Age |");
    expect(result).toContain("| --- | --- |");
    expect(result).toContain("| Alice | 30 |");
  });

  it("should return empty string for non-doc node", () => {
    expect(jsonContentToMarkdown({ type: "paragraph" })).toBe("");
  });

  it("should return empty string for doc without content", () => {
    expect(jsonContentToMarkdown({ type: "doc" })).toBe("");
  });

  it("should apply rewriteImageSrc option", () => {
    const result = jsonContentToMarkdown(
      doc({
        type: "image",
        attrs: { src: "/images/abc.jpg", alt: "" },
      }),
      { rewriteImageSrc: (src) => src.replace("/images/", "./local/") },
    );
    expect(result).toContain("![](./local/abc.jpg)");
  });

  it("should convert inline math", () => {
    const result = jsonContentToMarkdown(
      doc(
        paragraph(text("formula: "), {
          type: "inlineMath",
          attrs: { latex: "x^2 + y^2 = z^2" },
        }),
      ),
    );
    expect(result).toContain("formula: $x^2 + y^2 = z^2$");
  });

  it("should convert block math", () => {
    const result = jsonContentToMarkdown(
      doc(
        paragraph(text("before")),
        { type: "blockMath", attrs: { latex: "E = mc^2" } },
        paragraph(text("after")),
      ),
    );
    expect(result).toContain("$$");
    expect(result).toContain("E = mc^2");
  });

  it("should skip empty math nodes", () => {
    const result = jsonContentToMarkdown(
      doc(
        paragraph(
          text("a"),
          { type: "inlineMath", attrs: { latex: "" } },
          text("b"),
        ),
      ),
    );
    expect(result).not.toContain("$$");
    expect(result).toContain("a");
    expect(result).toContain("b");
  });

  it("should convert nested list", () => {
    const result = jsonContentToMarkdown(
      doc({
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              paragraph(text("parent")),
              {
                type: "bulletList",
                content: [
                  {
                    type: "listItem",
                    content: [paragraph(text("child"))],
                  },
                ],
              },
            ],
          },
        ],
      }),
    );
    expect(result).toContain("- parent");
    expect(result).toContain("  - child");
  });
});

describe("math round-trip", () => {
  it("should preserve inline math through json -> md -> json", async () => {
    const original = doc(
      paragraph(text("formula: "), {
        type: "inlineMath",
        attrs: { latex: "\\frac{a}{b}" },
      }),
    );
    const md = jsonContentToMarkdown(original);
    const round = await markdownToJsonContent(md);

    const p = round.content!.find((n) => n.type === "paragraph");
    expect(p).toBeDefined();
    const inlineMath = p!.content!.find((n) => n.type === "inlineMath");
    expect(inlineMath).toBeDefined();
    expect(inlineMath!.attrs?.latex).toBe("\\frac{a}{b}");
  });

  it("should preserve ordinary dollar text through json -> md -> json", async () => {
    const original = doc(paragraph(text("I have $5 and $10.")));
    const md = jsonContentToMarkdown(original);
    const round = await markdownToJsonContent(md);

    const p = round.content!.find((n) => n.type === "paragraph");
    expect(p).toBeDefined();
    const inlineMath = p!.content!.find((n) => n.type === "inlineMath");
    expect(inlineMath).toBeUndefined();
    const textNodes = p!.content!.filter((n) => n.type === "text");
    expect(textNodes.length).toBeGreaterThan(0);
    const textContent = textNodes.map((n) => n.text ?? "").join("");
    expect(textContent).toContain("$5");
    expect(textContent).toContain("$10");
  });

  it("should preserve block math through json -> md -> json", async () => {
    const original = doc(
      paragraph(text("before")),
      { type: "blockMath", attrs: { latex: "\\sum_{i=1}^{n} x_i" } },
      paragraph(text("after")),
    );
    const md = jsonContentToMarkdown(original);
    const round = await markdownToJsonContent(md);

    const blockMath = round.content!.find((n) => n.type === "blockMath");
    expect(blockMath).toBeDefined();
    expect(blockMath!.attrs?.latex).toBe("\\sum_{i=1}^{n} x_i");
  });
});

describe("makeExportImageRewriter", () => {
  const rewriter = makeExportImageRewriter();

  it("should rewrite /images/key?quality=80 to ./images/key", () => {
    expect(rewriter("/images/abc-123.jpg?quality=80")).toBe(
      "./images/abc-123.jpg",
    );
  });

  it("should preserve external URLs", () => {
    const url = "https://example.com/photo.jpg";
    expect(rewriter(url)).toBe(url);
  });

  it("should handle /images/key without query params", () => {
    expect(rewriter("/images/abc.jpg")).toBe("./images/abc.jpg");
  });
});
