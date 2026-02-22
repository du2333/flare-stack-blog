import { describe, expect, it } from "vitest";
import { markdownToJsonContent } from "@/features/import-export/utils/markdown-parser";

describe("markdownToJsonContent", () => {
  it("should convert heading + bold + list", async () => {
    const json = await markdownToJsonContent(
      "# Hello\n\nSome **bold** text.\n\n- item 1\n- item 2",
    );

    expect(json.type).toBe("doc");
    expect(json.content).toBeDefined();
    expect(json.content!.length).toBeGreaterThan(0);

    const types = json.content!.map((n) => n.type);
    expect(types).toContain("heading");
    expect(types).toContain("paragraph");
    expect(types).toContain("bulletList");
  });

  it("should convert code block with language", async () => {
    const json = await markdownToJsonContent("```js\nconsole.log('hi');\n```");

    const codeBlock = json.content!.find((n) => n.type === "codeBlock");
    expect(codeBlock).toBeDefined();
    expect(codeBlock!.attrs?.language).toBe("js");
  });

  it("should convert image", async () => {
    const json = await markdownToJsonContent(
      "![alt text](https://example.com/img.png)",
    );

    const image = json.content!.find((n) => n.type === "image");
    expect(image).toBeDefined();
    expect(image!.attrs?.src).toBe("https://example.com/img.png");
    expect(image!.attrs?.alt).toBe("alt text");
  });

  it("should convert blockquote", async () => {
    const json = await markdownToJsonContent("> quoted text");

    const blockquote = json.content!.find((n) => n.type === "blockquote");
    expect(blockquote).toBeDefined();
  });

  it("should convert table", async () => {
    const json = await markdownToJsonContent(
      "| a | b |\n| --- | --- |\n| 1 | 2 |",
    );

    const table = json.content!.find((n) => n.type === "table");
    expect(table).toBeDefined();
  });

  it("should convert link", async () => {
    const json = await markdownToJsonContent("[click me](https://example.com)");

    const paragraph = json.content!.find((n) => n.type === "paragraph");
    expect(paragraph).toBeDefined();
    const textNode = paragraph!.content!.find((n) => n.type === "text");
    expect(textNode!.text).toBe("click me");
    const linkMark = textNode!.marks?.find(
      (m: { type: string }) => m.type === "link",
    );
    expect(linkMark).toBeDefined();
  });

  it("should handle empty string", async () => {
    const json = await markdownToJsonContent("");

    expect(json.type).toBe("doc");
  });

  it("should handle plain text without any markdown syntax", async () => {
    const json = await markdownToJsonContent("Just plain text.");

    expect(json.type).toBe("doc");
    const paragraph = json.content!.find((n) => n.type === "paragraph");
    expect(paragraph).toBeDefined();
  });
});
