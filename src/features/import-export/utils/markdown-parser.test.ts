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

  it("should convert inline math", async () => {
    const json = await markdownToJsonContent("text $x^2 + y^2 = z^2$ more");

    const p = json.content!.find((n) => n.type === "paragraph");
    expect(p).toBeDefined();
    const inlineMath = p!.content!.find((n) => n.type === "inlineMath");
    expect(inlineMath).toBeDefined();
    expect(inlineMath!.attrs?.latex).toBe("x^2 + y^2 = z^2");
  });

  it("should convert block math", async () => {
    const json = await markdownToJsonContent(
      "before\n\n$$\nE = mc^2\n$$\n\nafter",
    );

    const blockMath = json.content!.find((n) => n.type === "blockMath");
    expect(blockMath).toBeDefined();
    expect(blockMath!.attrs?.latex).toBe("E = mc^2");
  });

  it("should keep ordinary dollar text as plain text (no math)", async () => {
    const json = await markdownToJsonContent("I have $5 in my pocket.");

    const p = json.content!.find((n) => n.type === "paragraph");
    expect(p).toBeDefined();
    const inlineMath = p!.content!.find((n) => n.type === "inlineMath");
    expect(inlineMath).toBeUndefined();
    const textContent = p!
      .content!.filter((n) => n.type === "text")
      .map((n) => n.text ?? "")
      .join("");
    expect(textContent).toContain("$5");
  });

  it("should keep price-like dollar text as plain text", async () => {
    const json = await markdownToJsonContent("The price is $10.99.");

    const p = json.content!.find((n) => n.type === "paragraph");
    expect(p).toBeDefined();
    const inlineMath = p!.content!.find((n) => n.type === "inlineMath");
    expect(inlineMath).toBeUndefined();
    expect(JSON.stringify(p)).toContain("$10.99");
  });

  it("should treat dollar in currency as plain text", async () => {
    const json = await markdownToJsonContent("Cost: $100");

    const p = json.content!.find((n) => n.type === "paragraph");
    expect(p).toBeDefined();
    const inlineMath = p!.content!.find((n) => n.type === "inlineMath");
    expect(inlineMath).toBeUndefined();
    const textContent = p!
      .content!.filter((n) => n.type === "text")
      .map((n) => n.text ?? "")
      .join("");
    expect(textContent).toBe("Cost: $100");
  });

  it("should keep currency range text as plain text", async () => {
    const json = await markdownToJsonContent("Budget is $5 or $10.");

    const p = json.content!.find((n) => n.type === "paragraph");
    expect(p).toBeDefined();
    const inlineMath = p!.content!.find((n) => n.type === "inlineMath");
    expect(inlineMath).toBeUndefined();
    const textContent = p!
      .content!.filter((n) => n.type === "text")
      .map((n) => n.text ?? "")
      .join("");
    expect(textContent).toContain("$5");
    expect(textContent).toContain("$10");
  });

  it("should not parse math inside inline code", async () => {
    const json = await markdownToJsonContent("Use `$x^2$` here.");

    expect(JSON.stringify(json)).not.toContain('"type":"inlineMath"');
    const p = json.content!.find((n) => n.type === "paragraph");
    expect(p).toBeDefined();
    expect(JSON.stringify(p)).toContain("$x^2");
  });

  it("should not parse math inside fenced code blocks", async () => {
    const json = await markdownToJsonContent(
      "```md\n$x^2$ and $$E=mc^2$$\n```",
    );

    expect(JSON.stringify(json)).not.toContain('"type":"inlineMath"');
    expect(JSON.stringify(json)).not.toContain('"type":"blockMath"');
    const codeBlock = json.content!.find((n) => n.type === "codeBlock");
    expect(codeBlock).toBeDefined();
  });

  it("should not parse math inside tilde fenced code blocks", async () => {
    const json = await markdownToJsonContent(
      "~~~md\n$x^2$ and $$E=mc^2$$\n~~~",
    );

    expect(JSON.stringify(json)).not.toContain('"type":"inlineMath"');
    expect(JSON.stringify(json)).not.toContain('"type":"blockMath"');
    const codeBlock = json.content!.find((n) => n.type === "codeBlock");
    expect(codeBlock).toBeDefined();
  });

  it("should not parse math inside double-backtick inline code", async () => {
    const json = await markdownToJsonContent("Use ``$x^2$`` here.");

    expect(JSON.stringify(json)).not.toContain('"type":"inlineMath"');
    const p = json.content!.find((n) => n.type === "paragraph");
    expect(p).toBeDefined();
    expect(JSON.stringify(p)).toContain("$x^2");
  });

  it("should treat comma-grouped numbers as plain text", async () => {
    const json = await markdownToJsonContent(
      "Amounts: $50,000,000 and $1,234,567.89",
    );

    const p = json.content!.find((n) => n.type === "paragraph");
    expect(p).toBeDefined();
    const inlineMath = p!.content!.find((n) => n.type === "inlineMath");
    expect(inlineMath).toBeUndefined();
    const textContent = p!
      .content!.filter((n) => n.type === "text")
      .map((n) => n.text ?? "")
      .join("");
    expect(textContent).toContain("$50,000,000");
    expect(textContent).toContain("$1,234,567.89");
  });

  it("should keep balanced comma-grouped dollar value as plain text", async () => {
    const json = await markdownToJsonContent("Value $50,000$ was recorded.");

    const p = json.content!.find((n) => n.type === "paragraph");
    expect(p).toBeDefined();
    const inlineMath = p!.content!.find((n) => n.type === "inlineMath");
    expect(inlineMath).toBeUndefined();
    const textContent = p!
      .content!.filter((n) => n.type === "text")
      .map((n) => n.text ?? "")
      .join("");
    expect(textContent).toContain("$50,000$");
  });

  it("should not parse math inside triple-backtick inline code", async () => {
    const json = await markdownToJsonContent("Use ```$x^2$``` here.");

    expect(JSON.stringify(json)).not.toContain('"type":"inlineMath"');
    const p = json.content!.find((n) => n.type === "paragraph");
    expect(p).toBeDefined();
    expect(JSON.stringify(p)).toContain("$x^2");
  });

  it("should not parse math inside quadruple-backtick inline code", async () => {
    const json = await markdownToJsonContent("Use ````$x^2$```` here.");

    expect(JSON.stringify(json)).not.toContain('"type":"inlineMath"');
  });

  it("should handle backticks inside code spans correctly", async () => {
    const json = await markdownToJsonContent("Use `` `$x^2$` `` here.");

    expect(JSON.stringify(json)).not.toContain('"type":"inlineMath"');
    const p = json.content!.find((n) => n.type === "paragraph");
    expect(p).toBeDefined();
    expect(JSON.stringify(p)).toContain("$x^2");
  });
});
