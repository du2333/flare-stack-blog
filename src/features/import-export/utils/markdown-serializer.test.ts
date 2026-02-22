import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import {
  jsonContentToMarkdown,
  makeExportImageRewriter,
} from "@/features/import-export/utils/markdown-serializer";

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
