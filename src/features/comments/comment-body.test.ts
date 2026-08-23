import { describe, expect, it } from "vitest";
import { jsonCommentToPlainText, splitCommentLine } from "./comment-body";

describe("jsonCommentToPlainText", () => {
  it("flattens a single paragraph", () => {
    expect(
      jsonCommentToPlainText({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "感谢！有考虑实现友链吗" }],
          },
        ],
      }),
    ).toBe("感谢！有考虑实现友链吗");
  });

  it("joins paragraphs with a newline", () => {
    expect(
      jsonCommentToPlainText({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "第一段" }] },
          { type: "paragraph", content: [{ type: "text", text: "第二段" }] },
        ],
      }),
    ).toBe("第一段\n第二段");
  });

  it("keeps hard breaks", () => {
    expect(
      jsonCommentToPlainText({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "一行" },
              { type: "hardBreak" },
              { type: "text", text: "二行" },
            ],
          },
        ],
      }),
    ).toBe("一行\n二行");
  });

  it("appends link href when it differs from the text", () => {
    expect(
      jsonCommentToPlainText({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "我是参考" },
              {
                type: "text",
                text: "这个教程",
                marks: [
                  {
                    type: "link",
                    attrs: { href: "https://example.com/guide" },
                  },
                ],
              },
              { type: "text", text: "实现的" },
            ],
          },
        ],
      }),
    ).toBe("我是参考这个教程 https://example.com/guide实现的");
  });

  it("does not duplicate a link whose text is the url", () => {
    expect(
      jsonCommentToPlainText({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "https://example.com",
                marks: [
                  { type: "link", attrs: { href: "https://example.com" } },
                ],
              },
            ],
          },
        ],
      }),
    ).toBe("https://example.com");
  });

  it("turns an image node into a url line", () => {
    expect(
      jsonCommentToPlainText({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "image",
                attrs: { src: "https://img.example/a.png" },
              },
              { type: "text", text: "是因为这个吗" },
            ],
          },
        ],
      }),
    ).toBe("https://img.example/a.png\n是因为这个吗");
  });

  it("strips bold and code marks", () => {
    expect(
      jsonCommentToPlainText({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "看 " },
              { type: "text", marks: [{ type: "code" }], text: "HIT" },
              { type: "text", text: " 就行" },
            ],
          },
        ],
      }),
    ).toBe("看 HIT 就行");
  });

  it("leaves already-plain strings alone", () => {
    expect(jsonCommentToPlainText("普通评论")).toBe("普通评论");
  });

  it("flattens leftover document JSON stored as a string", () => {
    expect(
      jsonCommentToPlainText(
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"good"}]}]}',
      ),
    ).toBe("good");
  });
});

describe("splitCommentLine", () => {
  it("autolinks http(s) urls and keeps surrounding text", () => {
    expect(
      splitCommentLine("见 https://example.com/a 和 http://foo.test/b."),
    ).toEqual([
      { type: "text", value: "见 " },
      { type: "link", value: "https://example.com/a" },
      { type: "text", value: " 和 " },
      { type: "link", value: "http://foo.test/b" },
      { type: "text", value: "." },
    ]);
  });

  it("does not autolink file urls", () => {
    expect(splitCommentLine("file:///tmp/a.png")).toEqual([
      { type: "text", value: "file:///tmp/a.png" },
    ]);
  });
});
