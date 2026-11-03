import { describe, expect, it } from "vitest";
import { refusedLinks } from "@/features/posts/utils/refused-links";
import { isOpenableLinkHref } from "@/lib/links/openable-link-href";

describe("isOpenableLinkHref", () => {
  it.each([
    "https://example.com/a?b#c",
    "HTTP://example.com",
    "mailto:a@b.example",
    "tel:+123",
    "/post/hello",
    "#section",
    "?page=2",
    "relative/path",
    "//cdn.example/x",
    "",
  ])("keeps %j", (href) => {
    expect(isOpenableLinkHref(href)).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    " javascript:alert(1)",
    "java\tscript:alert(1)",
    "java\nscript:alert(1)",
    "\u0001javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox",
    "file:///etc/passwd",
  ])("refuses %j", (href) => {
    expect(isOpenableLinkHref(href)).toBe(false);
  });
});

describe("refusedLinks", () => {
  it("lists every unshowable link once, in reading order, at any depth", () => {
    const link = (href: string) => ({
      type: "text",
      text: "x",
      marks: [{ type: "link", attrs: { href } }],
    });
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [link("data:,a"), link("/ok")] },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [link("javascript:void(0)"), link("data:,a")],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(refusedLinks(doc)).toEqual(["data:,a", "javascript:void(0)"]);
    expect(refusedLinks(null)).toEqual([]);
  });

  it("refuses a Direct Video's file, poster or page that is not HTTPS", () => {
    const direct = (attrs: Record<string, unknown>) => ({
      type: "video",
      attrs: { provider: "direct", ...attrs },
    });
    const doc = {
      type: "doc",
      content: [
        direct({
          src: "https://cdn.example.com/v.mp4",
          cover: "https://cdn.example.com/v.jpg",
          pageUrl: "https://example.com/watch",
        }),
        direct({
          src: "http://cdn.example.com/v.mp4",
          cover: "",
          pageUrl: null,
        }),
        direct({
          src: "https://cdn.example.com/v.mp4",
          cover: "data:image/png;base64,AA",
          pageUrl: "javascript:alert(1)",
        }),
        {
          type: "blockquote",
          content: [direct({ src: "https://u:p@cdn.example.com/v.mp4" })],
        },
        // Only a Direct Video uses these attributes.
        {
          type: "video",
          attrs: { provider: "youtube", videoId: "x", pageUrl: "javascript:" },
        },
      ],
    };

    expect(refusedLinks(doc)).toEqual([
      "http://cdn.example.com/v.mp4",
      "data:image/png;base64,AA",
      "javascript:alert(1)",
      "https://u:p@cdn.example.com/v.mp4",
    ]);
  });
});
