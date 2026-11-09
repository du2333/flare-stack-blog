import { describe, expect, it } from "vitest";
import { publicCommentPath, publicCommentUrl } from "./comment-url";

describe("publicCommentPath", () => {
  it("uses the comment id as the only search param", () => {
    expect(publicCommentPath({ type: "post", slug: "hello" }, 12)).toBe(
      "/post/hello?comment=12",
    );
  });

  it("links a Moment's comment on the Moment's page", () => {
    expect(publicCommentPath({ type: "moment", id: 7 }, 12)).toBe(
      "/moments/7?comment=12",
    );
  });
});

describe("publicCommentUrl", () => {
  it("builds an absolute URL on the public post page", () => {
    expect(
      publicCommentUrl("example.com", { type: "post", slug: "hello" }, 12),
    ).toBe("https://example.com/post/hello?comment=12");
  });

  it("builds an absolute URL on the public Moment page", () => {
    expect(publicCommentUrl("example.com", { type: "moment", id: 7 }, 12)).toBe(
      "https://example.com/moments/7?comment=12",
    );
  });
});
