import { describe, expect, it } from "vitest";
import {
  withCategoryFilter,
  withTagFilter,
  withUncategorizedFilter,
} from "./post-public-search";

describe("posts public search", () => {
  it("opens a Tag as the only filter", () => {
    expect(withTagFilter("Workers")).toEqual({ tagName: "Workers" });
  });

  it("opens a Category as the only filter", () => {
    expect(withCategoryFilter("生活")).toEqual({ categoryName: "生活" });
  });

  it("opens uncategorized as its own view", () => {
    expect(withUncategorizedFilter()).toEqual({ uncategorized: true });
  });
});
