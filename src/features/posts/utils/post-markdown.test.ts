import type { JSONContent } from "@tiptap/core";
import { getSchema } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { createSchemaExtensions } from "@/features/posts/editor/schema";
import {
  isPostMarkdownImage,
  postContentFromMarkdown,
  postContentToMarkdown,
} from "./post-markdown";

// Runs without a DOM, as on the Worker.

const schema = getSchema(createSchemaExtensions());

/** `content` as the editor holds it, every attribute filled in. */
function editorJson(content: JSONContent): JSONContent {
  const node = schema.nodeFromJSON(content);
  node.check();
  return node.toJSON();
}

function doc(...content: Array<JSONContent>): JSONContent {
  return { type: "doc", content };
}

function text(value: string, marks?: JSONContent["marks"]): JSONContent {
  return marks
    ? { type: "text", text: value, marks }
    : { type: "text", text: value };
}

function paragraph(...content: Array<JSONContent>): JSONContent {
  return { type: "paragraph", content };
}

function heading(level: number, value: string): JSONContent {
  return { type: "heading", attrs: { level }, content: [text(value)] };
}

function video(attrs: Record<string, unknown>): JSONContent {
  return { type: "video", attrs };
}

function cell(
  type: "tableHeader" | "tableCell",
  value: string,
  attrs: Record<string, unknown> = {},
): JSONContent {
  return { type, attrs, content: [paragraph(text(value))] };
}

function fromMarkdown(markdown: string) {
  const { contentJson, refusedImages } = postContentFromMarkdown(markdown);
  expect(refusedImages).toEqual([]);
  return editorJson(contentJson);
}

/** Writes `content` as Markdown and reads it back. */
function roundTrip(content: JSONContent) {
  const markdown = postContentToMarkdown(editorJson(content));
  if (markdown === null) throw new Error("Expected Markdown");
  return fromMarkdown(markdown);
}

describe("Post content as Markdown", () => {
  it("round-trips headings 2 to 4, marks, links, lists and quotes", () => {
    const content = doc(
      heading(2, "Two"),
      paragraph(
        text("Plain, "),
        text("bold", [{ type: "bold" }]),
        text(", "),
        text("italic", [{ type: "italic" }]),
        text(", "),
        text("gone", [{ type: "strike" }]),
        text(", "),
        text("a_b*c`d", [{ type: "code" }]),
        text(" and "),
        text("a link", [
          { type: "link", attrs: { href: "https://example.com/a?b=1" } },
        ]),
      ),
      heading(3, "Three"),
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              paragraph(text("one")),
              {
                type: "orderedList",
                content: [
                  { type: "listItem", content: [paragraph(text("nested"))] },
                ],
              },
            ],
          },
          { type: "listItem", content: [paragraph(text("two"))] },
        ],
      },
      heading(4, "Four"),
      {
        type: "blockquote",
        content: [paragraph(text("quoted")), paragraph(text("on"))],
      },
      { type: "horizontalRule" },
      paragraph(text("line"), { type: "hardBreak" }, text("break")),
    );
    expect(roundTrip(content)).toEqual(editorJson(content));
  });

  it("keeps heading levels when the top heading is not H2", () => {
    const content = doc(heading(3, "Three"), heading(4, "Four"));
    expect(roundTrip(content)).toEqual(editorJson(content));
  });

  it("moves headings down a level when the Markdown has an H1", () => {
    expect(fromMarkdown("# One\n\n## Two\n\n###### Six")).toEqual(
      editorJson(doc(heading(2, "One"), heading(3, "Two"), heading(4, "Six"))),
    );
  });

  it("keeps text that looks like Markdown syntax as text", () => {
    const content = doc(
      paragraph(text("# not a heading")),
      paragraph(text("- not a list\n1. nor this\n> nor a quote")),
      paragraph(text("---")),
      paragraph(text("*stars* _under_ [brackets] <b>tag</b> & ~tilde~")),
      paragraph(text("$x$ costs $5, $$y$$")),
    );
    expect(roundTrip(content)).toEqual(editorJson(content));
  });

  it("round-trips inline and block math, with $$ alone on its lines", () => {
    const content = doc(
      paragraph(
        text("Euler: "),
        { type: "inlineMath", attrs: { latex: "e^{i\\pi} + 1 = 0" } },
        text(" done"),
      ),
      { type: "blockMath", attrs: { latex: "\\frac{a}{b}\n= c" } },
    );
    const markdown = postContentToMarkdown(editorJson(content));
    expect(markdown).toContain("$e^{i\\pi} + 1 = 0$");
    expect(markdown).toContain("\n$$\n\\frac{a}{b}\n= c\n$$\n");
    expect(roundTrip(content)).toEqual(editorJson(content));
  });

  it("round-trips code blocks with their language, Mermaid included", () => {
    const content = doc(
      {
        type: "codeBlock",
        attrs: { language: "ts" },
        content: [text("const fence = ```;\n\n# not a heading")],
      },
      {
        type: "codeBlock",
        attrs: { language: "mermaid" },
        content: [text("flowchart LR\n  A --> B")],
      },
      {
        type: "codeBlock",
        attrs: { language: null },
        content: [text("plain")],
      },
    );
    const markdown = postContentToMarkdown(editorJson(content));
    expect(markdown).toContain("```mermaid\nflowchart LR\n  A --> B\n```");
    expect(roundTrip(content)).toEqual(editorJson(content));
  });

  it("round-trips web and Media images", () => {
    const content = doc(
      {
        type: "image",
        attrs: {
          src: "https://cdn.example.com/a (1).png",
          alt: "A [cat]",
          title: 'Say "hi"',
        },
      },
      {
        type: "image",
        attrs: { src: "/images/abc.webp", alt: "", title: null },
      },
    );
    expect(roundTrip(content)).toEqual(editorJson(content));
  });

  it("keeps table alignment and resets column widths to equal", () => {
    const table = (widths: Array<Array<number> | null>): JSONContent => ({
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            cell("tableHeader", "Left", { align: "left", colwidth: widths[0] }),
            cell("tableHeader", "Mid", {
              align: "center",
              colwidth: widths[1],
            }),
            cell("tableHeader", "Right", {
              align: "right",
              colwidth: widths[2],
            }),
            cell("tableHeader", "None", { colwidth: widths[3] }),
          ],
        },
        {
          type: "tableRow",
          content: [
            cell("tableCell", "1", { align: "left", colwidth: widths[0] }),
            cell("tableCell", "a | b", {
              align: "center",
              colwidth: widths[1],
            }),
            cell("tableCell", "3", { align: "right", colwidth: widths[2] }),
            cell("tableCell", "4", { colwidth: widths[3] }),
          ],
        },
      ],
    });
    const markdown = postContentToMarkdown(
      editorJson(doc(table([[120], [80], [200], [60]]))),
    );
    expect(markdown).toMatch(/^\| :-+ \| :-+: \| -+: \| -+ \|$/m);
    expect(fromMarkdown(markdown ?? "")).toEqual(
      editorJson(doc(table([null, null, null, null]))),
    );
  });

  it("writes a video as its link alone on a line and reads it back", () => {
    const bilibili = {
      provider: "bilibili",
      videoId: "BV1fK4y1s7Qf",
      page: 2,
      start: 90,
    };
    const youtube = {
      provider: "youtube",
      videoId: "dQw4w9WgXcQ",
      page: null,
      start: 42,
    };
    const av = {
      provider: "bilibili",
      videoId: "av170001",
      page: null,
      start: null,
    };
    const content = doc(video(bilibili), video(youtube), video(av));

    expect(postContentToMarkdown(editorJson(content))).toBe(
      [
        "https://www.bilibili.com/video/BV1fK4y1s7Qf/?p=2&t=90",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
        "https://www.bilibili.com/video/av170001/",
      ].join("\n\n") + "\n",
    );
    expect(roundTrip(content)).toEqual(editorJson(content));
  });

  it("drops what Markdown cannot carry about a video", () => {
    const content = doc(
      video({
        provider: "youtube",
        videoId: "dQw4w9WgXcQ",
        title: "Never",
        cover: null,
        duration: 213,
      }),
    );
    expect(roundTrip(content)).toEqual(
      editorJson(doc(video({ provider: "youtube", videoId: "dQw4w9WgXcQ" }))),
    );
  });

  it("only makes a video of a link alone in its paragraph", () => {
    expect(
      fromMarkdown(
        [
          "<https://youtu.be/dQw4w9WgXcQ>",
          "Watch https://youtu.be/dQw4w9WgXcQ now",
          "- https://youtu.be/dQw4w9WgXcQ",
        ].join("\n\n"),
      ).content?.map((node) => node.type),
    ).toEqual(["video", "paragraph", "bulletList"]);
  });

  it("keeps [address](address) a link, even a video's, both ways", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const content = doc(
      paragraph(text(url, [{ type: "link", attrs: { href: url } }])),
      paragraph(
        text("https://youtu.be/dQw4w9WgXcQ", [
          { type: "link", attrs: { href: "https://youtu.be/dQw4w9WgXcQ" } },
        ]),
      ),
    );
    expect(postContentToMarkdown(editorJson(content))).toBe(
      `[${url}](${url})\n\n[https://youtu.be/dQw4w9WgXcQ](https://youtu.be/dQw4w9WgXcQ)\n`,
    );
    expect(roundTrip(content)).toEqual(editorJson(content));
    expect(
      fromMarkdown(
        [`[${url}](${url})`, `[watch](${url})`, url].join("\n\n"),
      ).content?.map((node) => node.type),
    ).toEqual(["paragraph", "paragraph", "video"]);
  });

  it("writes a Direct Video as its <video> line, escaped, and reads it back", () => {
    const direct = video({
      provider: "direct",
      src: "https://cdn.example.com/a.mp4?x=1&y=2",
      cover: "https://cdn.example.com/a.jpg",
      title: 'Say "hi" & <wave>',
      pageUrl: "https://example.com/watch/1",
    });
    const bare = video({
      provider: "direct",
      src: "https://cdn.example.com/b.mp4",
    });
    const content = doc(direct, bare);

    expect(postContentToMarkdown(editorJson(content))).toBe(
      [
        '<video src="https://cdn.example.com/a.mp4?x=1&amp;y=2" poster="https://cdn.example.com/a.jpg" title="Say &quot;hi&quot; &amp; &lt;wave&gt;" data-page="https://example.com/watch/1"></video>',
        '<video src="https://cdn.example.com/b.mp4"></video>',
      ].join("\n\n") + "\n",
    );
    expect(roundTrip(content)).toEqual(editorJson(content));
  });

  it("does not write a Direct Video's length", () => {
    const content = doc(
      video({
        provider: "direct",
        src: "https://cdn.example.com/a.mp4",
        duration: 95,
      }),
    );
    expect(roundTrip(content)).toEqual(
      editorJson(
        doc(
          video({ provider: "direct", src: "https://cdn.example.com/a.mp4" }),
        ),
      ),
    );
  });

  it("reads a <video> line's four attributes in any order and quoting", () => {
    expect(
      fromMarkdown(
        "<VIDEO data-page='https://example.com/w' TITLE=\"&#26631;&#x9898;\" poster=\"https://cdn.example.com/p.jpg\" src='https://cdn.example.com/v.mp4' ></video>",
      ),
    ).toEqual(
      editorJson(
        doc(
          video({
            provider: "direct",
            src: "https://cdn.example.com/v.mp4",
            cover: "https://cdn.example.com/p.jpg",
            title: "标题",
            pageUrl: "https://example.com/w",
          }),
        ),
      ),
    );
  });

  it("drops a <video> line's poster or page when it is not HTTPS", () => {
    expect(
      fromMarkdown(
        '<video src="https://cdn.example.com/v.mp4" poster="http://cdn.example.com/p.jpg" data-page="javascript:alert(1)"></video>',
      ),
    ).toEqual(
      editorJson(
        doc(
          video({ provider: "direct", src: "https://cdn.example.com/v.mp4" }),
        ),
      ),
    );
  });

  it("keeps any other <video> tag, and other HTML, as text", () => {
    const lines = [
      '<video src="http://cdn.example.com/v.mp4"></video>',
      '<video src="javascript:alert(1)"></video>',
      '<video src="https://user:pw@cdn.example.com/v.mp4"></video>',
      '<video poster="https://cdn.example.com/p.jpg"></video>',
      '<video src="https://cdn.example.com/v.mp4" onerror="x()"></video>',
      '<video src="https://cdn.example.com/v.mp4" controls></video>',
      '<video src="https://cdn.example.com/v.mp4" src="https://cdn.example.com/w.mp4"></video>',
      '<video src="https://cdn.example.com/v.mp4"></video> and more',
      '<video src="https://cdn.example.com/v.mp4">',
      '<video\nsrc="https://cdn.example.com/v.mp4"></video>',
      '<div data-type="video" data-provider="direct"></div>',
    ];
    expect(fromMarkdown(lines.join("\n\n"))).toEqual(
      editorJson(doc(...lines.map((line) => paragraph(text(line))))),
    );
    // A paragraph keeps the lines it had.
    const kept = 'a\n<video src="http://cdn.example.com/v.mp4"></video>\nb';
    expect(fromMarkdown(kept)).toEqual(editorJson(doc(paragraph(text(kept)))));
  });

  it("makes a Direct Video of a <video> line inside a paragraph", () => {
    expect(
      fromMarkdown(
        'Before\n<video src="https://cdn.example.com/v.mp4"></video>\nAfter',
      ),
    ).toEqual(
      editorJson(
        doc(
          paragraph(text("Before")),
          video({ provider: "direct", src: "https://cdn.example.com/v.mp4" }),
          paragraph(text("After")),
        ),
      ),
    );
  });

  it("keeps text that reads like a <video> line as text", () => {
    const content = doc(
      paragraph(text('<video src="https://cdn.example.com/v.mp4"></video>')),
    );
    expect(postContentToMarkdown(editorJson(content))).not.toContain("<video");
  });

  it("writes nothing for a Direct Video with no HTTPS file", () => {
    expect(
      postContentToMarkdown(
        editorJson(
          doc(
            video({ provider: "direct", src: "http://cdn.example.com/v.mp4" }),
            paragraph(text("after")),
          ),
        ),
      ),
    ).toBe("after\n");
  });

  it("flattens merged cells and cells of several lines, as the rules say", () => {
    const merged = doc({
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [cell("tableHeader", "Both", { colspan: 2 })],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [paragraph(text("a")), paragraph(text("b"))],
            },
            cell("tableCell", "c"),
          ],
        },
      ],
    });
    expect(roundTrip(merged)).toEqual(
      editorJson(
        doc({
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                cell("tableHeader", "Both"),
                { type: "tableHeader", content: [paragraph()] },
              ],
            },
            {
              type: "tableRow",
              content: [cell("tableCell", "a<br>b"), cell("tableCell", "c")],
            },
          ],
        }),
      ),
    );
  });

  it("leaves no trace of how a link was written", () => {
    const { contentJson } = postContentFromMarkdown(
      "<https://example.com> and https://example.org\n\nhttps://example.net",
    );
    const links: Array<unknown> = [];
    const visit = (node: JSONContent) => {
      for (const mark of node.marks ?? []) links.push(mark.attrs);
      node.content?.forEach(visit);
    };
    visit(contentJson);
    expect(links).toEqual([
      { href: "https://example.com", title: null },
      { href: "https://example.org", title: null },
      { href: "https://example.net", title: null },
    ]);
  });

  it("refuses images that are neither web addresses nor Media paths", () => {
    const { refusedImages } = postContentFromMarkdown(
      [
        "![a](./a.png)",
        "![b](https://example.com/b.png) ![c](C:/photos/c.png)",
        "![d](//cdn.example.com/d.png)",
        "![e](/images/e.png)",
        "![f](file:///f.png)",
      ].join("\n\n"),
    );
    expect(refusedImages).toEqual([
      "./a.png",
      "C:/photos/c.png",
      "//cdn.example.com/d.png",
      "file:///f.png",
    ]);
  });

  it("accepts http(s) addresses and Media paths as images", () => {
    expect(isPostMarkdownImage("https://example.com/a.png")).toBe(true);
    expect(isPostMarkdownImage("http://example.com/a.png")).toBe(true);
    expect(isPostMarkdownImage("/images/a.png?quality=80")).toBe(true);
    expect(isPostMarkdownImage("/images/")).toBe(false);
    expect(isPostMarkdownImage("/uploads/a.png")).toBe(false);
    expect(isPostMarkdownImage("a.png")).toBe(false);
  });

  it("reads an empty body as an empty paragraph and writes null as null", () => {
    expect(fromMarkdown("")).toEqual(editorJson(doc({ type: "paragraph" })));
    expect(postContentToMarkdown(null)).toBeNull();
  });

  it("reads a body with nothing to write as null, as the docs say", () => {
    expect(postContentToMarkdown(doc({ type: "paragraph" }))).toBeNull();
    expect(postContentToMarkdown(doc(paragraph(text("hi"))))).toBe("hi\n");
  });

  it("writes underline as ++text++ and reads it back", () => {
    const content = doc(
      paragraph(text("a "), text("under", [{ type: "underline" }])),
    );
    const markdown = postContentToMarkdown(editorJson(content));
    expect(markdown).toBe("a ++under++\n");
    expect(fromMarkdown(markdown ?? "")).toEqual(editorJson(content));
  });
});
