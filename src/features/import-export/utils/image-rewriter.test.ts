import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import {
  extractMarkdownImages,
  rewriteImagePaths,
  rewriteMarkdownImagePaths,
} from "@/features/import-export/utils/image-rewriter";
import { resolveRelativePath } from "@/features/import-export/workflows/import-helpers";

describe("rewriteImagePaths", () => {
  it("should rewrite image src in JSONContent", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: "/images/old-key.jpg?quality=80", alt: "test" },
        },
      ],
    };
    const map = new Map([["old-key.jpg", "new-key.jpg"]]);
    const result = rewriteImagePaths(doc, map);

    expect(result.content![0].attrs!.src).toBe(
      "/images/new-key.jpg?quality=80",
    );
  });

  it("should not modify original doc", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: "/images/old.jpg?quality=80", alt: "" },
        },
      ],
    };
    const map = new Map([["old.jpg", "new.jpg"]]);
    rewriteImagePaths(doc, map);

    expect(doc.content![0].attrs!.src).toBe("/images/old.jpg?quality=80");
  });

  it("should handle nested images", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "image",
              attrs: { src: "/images/nested.png?quality=80", alt: "" },
            },
          ],
        },
      ],
    };
    const map = new Map([["nested.png", "new-nested.png"]]);
    const result = rewriteImagePaths(doc, map);

    expect(result.content![0].content![0].attrs!.src).toBe(
      "/images/new-nested.png?quality=80",
    );
  });

  it("should skip images not in rewrite map", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: "/images/keep.jpg?quality=80", alt: "" },
        },
      ],
    };
    const result = rewriteImagePaths(doc, new Map());

    expect(result.content![0].attrs!.src).toBe("/images/keep.jpg?quality=80");
  });

  it("should handle doc with no images", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "no images" }],
        },
      ],
    };
    const result = rewriteImagePaths(doc, new Map([["a", "b"]]));

    expect(result.content![0].content![0].text).toBe("no images");
  });
});

describe("extractMarkdownImages", () => {
  it("should extract relative image paths", () => {
    const result = extractMarkdownImages("![alt](./images/photo.jpg)");
    expect(result).toEqual([
      { original: "./images/photo.jpg", type: "relative" },
    ]);
  });

  it("should extract remote URLs", () => {
    const result = extractMarkdownImages("![](https://example.com/img.png)");
    expect(result).toEqual([
      { original: "https://example.com/img.png", type: "remote" },
    ]);
  });

  it("should extract data URIs", () => {
    const result = extractMarkdownImages("![](data:image/png;base64,abc123)");
    expect(result).toEqual([
      { original: "data:image/png;base64,abc123", type: "data-uri" },
    ]);
  });

  it("should extract multiple images", () => {
    const md = "![a](a.jpg) text ![b](https://b.com/b.png)";
    const result = extractMarkdownImages(md);
    expect(result).toHaveLength(2);
  });

  it("should return empty array for no images", () => {
    expect(extractMarkdownImages("Just text, no images")).toEqual([]);
  });

  it("should handle mixed types", () => {
    const md =
      "![](./local.jpg) ![](https://remote.com/r.png) ![](data:image/gif;base64,x)";
    const result = extractMarkdownImages(md);

    expect(result.map((r) => r.type)).toEqual([
      "relative",
      "remote",
      "data-uri",
    ]);
  });
});

describe("rewriteMarkdownImagePaths", () => {
  it("should rewrite matching image paths", () => {
    const result = rewriteMarkdownImagePaths(
      "![a](old.jpg)",
      new Map([["old.jpg", "new.jpg"]]),
    );
    expect(result).toBe("![a](new.jpg)");
  });

  it("should not rewrite non-matching paths", () => {
    const result = rewriteMarkdownImagePaths(
      "![a](other.jpg)",
      new Map([["old.jpg", "new.jpg"]]),
    );
    expect(result).toBe("![a](other.jpg)");
  });

  it("should rewrite multiple images", () => {
    const md = "![x](a.jpg) ![y](b.jpg)";
    const result = rewriteMarkdownImagePaths(
      md,
      new Map([
        ["a.jpg", "new-a.jpg"],
        ["b.jpg", "new-b.jpg"],
      ]),
    );
    expect(result).toBe("![x](new-a.jpg) ![y](new-b.jpg)");
  });

  it("should preserve alt text", () => {
    const result = rewriteMarkdownImagePaths(
      "![My Alt Text](old.jpg)",
      new Map([["old.jpg", "new.jpg"]]),
    );
    expect(result).toBe("![My Alt Text](new.jpg)");
  });

  it("should handle markdown with no images", () => {
    const md = "Just text here";
    expect(rewriteMarkdownImagePaths(md, new Map([["a", "b"]]))).toBe(md);
  });
});

describe("resolveRelativePath", () => {
  it("should resolve simple relative path from base", () => {
    expect(resolveRelativePath("posts", "images/a.jpg")).toBe(
      "posts/images/a.jpg",
    );
  });

  it("should strip leading ./", () => {
    expect(resolveRelativePath("posts", "./images/a.jpg")).toBe(
      "posts/images/a.jpg",
    );
  });

  it("should resolve .. to parent directory", () => {
    expect(resolveRelativePath("posts/sub", "../assets/a.jpg")).toBe(
      "posts/assets/a.jpg",
    );
  });

  it("should handle empty base (root-level .md)", () => {
    expect(resolveRelativePath("", "images/a.jpg")).toBe("images/a.jpg");
  });

  it("should handle empty base with ./", () => {
    expect(resolveRelativePath("", "./photo.jpg")).toBe("photo.jpg");
  });

  it("should handle sibling file reference", () => {
    expect(resolveRelativePath("content/posts", "cover.jpg")).toBe(
      "content/posts/cover.jpg",
    );
  });

  it("should handle deeply nested ..", () => {
    expect(resolveRelativePath("a/b/c", "../../img.jpg")).toBe("a/img.jpg");
  });
});
