import { describe, expect, it } from "vitest";
import { remainingPublishedReplies } from "./comment-thread";

describe("remainingPublishedReplies", () => {
  it("is the published replies not yet on screen", () => {
    expect(
      remainingPublishedReplies(5, [
        { status: "deleted" },
        { status: "published" },
        { status: "published" },
      ]),
    ).toBe(3);
  });

  it("is zero when every published reply is already visible", () => {
    expect(
      remainingPublishedReplies(2, [
        { status: "published" },
        { status: "published" },
        { status: "deleted" },
      ]),
    ).toBe(0);
  });
});
