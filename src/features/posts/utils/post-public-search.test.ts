import { describe, expect, it } from "vitest";
import {
  withCategoryFilter,
  withTagFilter,
  withUncategorizedFilter,
} from "./post-public-search";

describe("posts public search", () => {
  it("keeps a Category filter when toggling a Tag", () => {
    expect(
      withTagFilter({ categoryName: "技术", tagName: "Workers" }, "Workers"),
    ).toEqual({ categoryName: "技术" });
    expect(withTagFilter({ categoryName: "技术" }, "Workers")).toEqual({
      categoryName: "技术",
      tagName: "Workers",
    });
  });

  it("clears uncategorized when choosing a Category", () => {
    expect(withCategoryFilter({ uncategorized: true }, "生活")).toEqual({
      categoryName: "生活",
    });
  });

  it("toggles uncategorized and drops Category", () => {
    expect(withUncategorizedFilter({ categoryName: "技术" })).toEqual({
      uncategorized: true,
    });
  });
});
