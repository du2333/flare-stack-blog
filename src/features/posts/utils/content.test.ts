import type { JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import {
  convertToPlainText,
  FALLBACK_SLUG,
  jsonContentHasType,
  mediaPathKey,
  slugify,
} from "./content";

describe("mediaPathKey", () => {
  it("reads the key of a Media path, alone or on the site's address", () => {
    expect(mediaPathKey("/images/a.png?quality=80", "blog.example")).toBe(
      "a.png",
    );
    expect(
      mediaPathKey("https://blog.example/images/a.png", "blog.example"),
    ).toBe("a.png");
    expect(
      mediaPathKey("http://BLOG.example/images/a.png?v=2", "blog.example"),
    ).toBe("a.png");
  });

  it("takes any other address for an external image", () => {
    for (const src of [
      "https://cdn.example/images/a.png",
      "https://blog.example.evil/images/a.png",
      "https://blog.example:8443/images/a.png",
      "//blog.example/images/a.png",
      "https://blog.example/uploads/a.png",
      "ftp://blog.example/images/a.png",
    ]) {
      expect(mediaPathKey(src, "blog.example")).toBeUndefined();
    }
  });
});

const doc = (...content: Array<JSONContent>): JSONContent => ({
  type: "doc",
  content,
});

describe("jsonContentHasType", () => {
  it("returns false for empty content", () => {
    expect(jsonContentHasType(null, "codeBlock")).toBe(false);
    expect(jsonContentHasType(doc(), "codeBlock")).toBe(false);
  });

  it("finds nested code and math nodes", () => {
    const content = doc(
      {
        type: "paragraph",
        content: [{ type: "inlineMath", attrs: { latex: "x" } }],
      },
      {
        type: "codeBlock",
        attrs: { language: "ts" },
        content: [{ type: "text", text: "const n = 1;" }],
      },
    );

    expect(jsonContentHasType(content, "codeBlock")).toBe(true);
    expect(jsonContentHasType(content, ["inlineMath", "blockMath"])).toBe(true);
    expect(jsonContentHasType(content, "blockMath")).toBe(false);
    expect(jsonContentHasType(content, "image")).toBe(false);
  });
});

describe("convertToPlainText", () => {
  it("gives a video's title and its page, or a Direct Video's file", () => {
    const text = convertToPlainText(
      doc(
        {
          type: "video",
          attrs: { provider: "youtube", videoId: "dQw4w9WgXcQ", title: "Song" },
        },
        {
          type: "video",
          attrs: {
            provider: "direct",
            src: "https://cdn.example.com/a.mp4",
            pageUrl: "https://example.com/watch/1",
            title: "Intro",
          },
        },
        {
          type: "video",
          attrs: { provider: "direct", src: "https://cdn.example.com/b.mp4" },
        },
        {
          type: "video",
          attrs: { provider: "direct", src: "javascript:alert(1)" },
        },
      ),
    );
    expect(text.split("\n").filter(Boolean)).toEqual([
      "Song https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "Intro https://example.com/watch/1",
      "https://cdn.example.com/b.mp4",
    ]);
  });
});

describe("slugify", () => {
  it.each([
    ["Hello, World!", "hello-world"],
    ["Hello   under_score", "hello-under-score"],
    ["你好，世界 2026", "你好世界-2026"],
    ["--Dashes--  and---more--", "dashes-and-more"],
  ])("makes a slug of %j", (title, slug) => {
    expect(slugify(title)).toBe(slug);
  });

  it.each([
    ["a ligature", "ﬁle", "file"],
    ["an ffi ligature", "o\uFB03ce", "office"],
    [
      "fullwidth letters and digits",
      "ＡＵＤＩＴ３ Fullwidth",
      "audit3-fullwidth",
    ],
    ["a fullwidth space", "ＡＢＣ\u3000ＤＥＦ", "abc-def"],
    ["sharp s", "Straße", "strasse"],
    ["capital sharp s", "STRAẞE", "strasse"],
    ["accents", "Café Crème", "cafe-creme"],
    ["decomposed accents", "Cafe\u0301", "cafe"],
  ])("keeps the letters of %s", (_name, title, slug) => {
    expect(slugify(title)).toBe(slug);
  });

  it.each([
    ["emoji alone", "😀🎉"],
    ["a joined emoji", "👩\u200D💻"],
    ["symbols alone", "★ ✓ ?!"],
    ["empty", ""],
    ["blank", "   "],
    ["nothing", null],
    ["a script it does not keep", "ひらがな"],
  ])("falls back to untitled-log for %s", (_name, title) => {
    expect(slugify(title)).toBe(FALLBACK_SLUG);
    expect(FALLBACK_SLUG).toBe("untitled-log");
  });

  it("drops emoji and keeps the letters around them", () => {
    expect(slugify("Launch 🚀 day")).toBe("launch-day");
  });
});
