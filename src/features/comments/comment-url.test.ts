import { describe, expect, it } from "vitest";
import { publicCommentPath, publicCommentUrl } from "./comment-url";

describe("publicCommentPath", () => {
  it("uses the comment id as the only search param", () => {
    expect(publicCommentPath("hello", 12)).toBe("/post/hello?comment=12");
  });
});

describe("publicCommentUrl", () => {
  it("builds an absolute URL on the public post page", () => {
    expect(publicCommentUrl("example.com", "hello", 12)).toBe(
      "https://example.com/post/hello?comment=12",
    );
  });
});
