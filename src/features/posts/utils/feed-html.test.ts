import { describe, expect, it } from "vitest";
import { renderFeedHtml } from "./feed-html";

const ORIGIN = "https://blog.example";

const doc = (...content: Array<object>) => ({ type: "doc", content });

describe("renderFeedHtml", () => {
  it("renders paragraphs, marks, headings and lists as HTML", () => {
    const html = renderFeedHtml(
      doc(
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Title" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "bold", marks: [{ type: "bold" }] },
            { type: "text", text: " and " },
            {
              type: "text",
              text: "link",
              marks: [
                { type: "link", attrs: { href: "https://example.com/" } },
              ],
            },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "one" }] },
              ],
            },
          ],
        },
      ),
      ORIGIN,
    );
    expect(html).toContain("<h2");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain(
      '<a href="https://example.com/" target="_blank" rel="noopener noreferrer nofollow">link</a>',
    );
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>");
  });

  it("escapes text instead of passing markup through", () => {
    const html = renderFeedHtml(
      doc({
        type: "paragraph",
        content: [{ type: "text", text: "<script>alert(1)</script> & more" }],
      }),
      ORIGIN,
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp; more");
  });

  it("makes Media images absolute", () => {
    const html = renderFeedHtml(
      doc(
        { type: "image", attrs: { src: "/images/a.png", alt: 'A "quote"' } },
        { type: "image", attrs: { src: "https://cdn.example/b.png" } },
      ),
      ORIGIN,
    );
    expect(html).toContain('<img src="https://blog.example/images/a.png"');
    expect(html).toContain('alt="A &quot;quote&quot;"');
    expect(html).toContain('<img src="https://cdn.example/b.png"');
  });

  it("writes a video as a link to its page and math as code", () => {
    const html = renderFeedHtml(
      doc(
        {
          type: "video",
          attrs: { provider: "youtube", videoId: "dQw4w9WgXcQ", title: "Song" },
        },
        { type: "blockMath", attrs: { latex: "a < b" } },
        {
          type: "paragraph",
          content: [{ type: "inlineMath", attrs: { latex: "x^2" } }],
        },
      ),
      ORIGIN,
    );
    expect(html).toContain(
      '<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Song</a>',
    );
    expect(html).toContain("<pre><code>a &lt; b</code></pre>");
    expect(html).toContain("<code>x^2</code>");
  });

  it("writes a Direct Video as a <video> with a link to its page, or its file", () => {
    const html = renderFeedHtml(
      doc(
        {
          type: "video",
          attrs: {
            provider: "direct",
            src: "https://cdn.example.com/a.mp4?x=1&y=2",
            cover: "https://cdn.example.com/a.jpg",
            title: "<Intro>",
            pageUrl: "https://example.com/watch/1",
          },
        },
        {
          type: "video",
          attrs: { provider: "direct", src: "https://cdn.example.com/b.mp4" },
        },
      ),
      ORIGIN,
    );
    expect(html).toBe(
      [
        '<video controls preload="none" src="https://cdn.example.com/a.mp4?x=1&amp;y=2" poster="https://cdn.example.com/a.jpg"></video>',
        '<p><a href="https://example.com/watch/1">&lt;Intro&gt;</a></p>',
        '<video controls preload="none" src="https://cdn.example.com/b.mp4"></video>',
        '<p><a href="https://cdn.example.com/b.mp4">https://cdn.example.com/b.mp4</a></p>',
      ].join(""),
    );
  });

  it("leaves out a Direct Video's addresses that are not HTTPS", () => {
    const html = renderFeedHtml(
      doc(
        {
          type: "video",
          attrs: {
            provider: "direct",
            src: "https://cdn.example.com/a.mp4",
            cover: "javascript:alert(1)",
            pageUrl: "javascript:alert(2)",
          },
        },
        {
          type: "video",
          attrs: { provider: "direct", src: "http://cdn.example.com/b.mp4" },
        },
      ),
      ORIGIN,
    );
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("b.mp4");
    expect(html).toContain(
      '<p><a href="https://cdn.example.com/a.mp4">https://cdn.example.com/a.mp4</a></p>',
    );
  });

  it("gives an empty string for no body", () => {
    expect(renderFeedHtml(null, ORIGIN)).toBe("");
  });

  it("sets a link's target and rel itself, shows no class and makes site paths absolute", () => {
    const html = renderFeedHtml(
      doc({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "a",
            marks: [
              {
                type: "link",
                attrs: {
                  href: "/post/b",
                  target: "_self",
                  rel: "opener",
                  class: "fixed inset-0",
                  title: 'say "hi"',
                },
              },
            ],
          },
        ],
      }),
      ORIGIN,
    );
    expect(html).toBe(
      '<p><a href="https://blog.example/post/b" title="say &quot;hi&quot;" target="_blank" rel="noopener noreferrer nofollow">a</a></p>',
    );
  });
});
