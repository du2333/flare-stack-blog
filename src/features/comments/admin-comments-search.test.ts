import { expect, it } from "vitest";
import { withoutHiddenFilters } from "./admin-comments-search";

it("drops the search and the Post filter from the 待回复 address and returns to page 1", () => {
  expect(
    withoutHiddenFilters({ view: "unreplied", page: 3, search: "x", post: 3 }),
  ).toEqual({ view: "unreplied", page: 1, search: "", post: undefined });
  expect(
    withoutHiddenFilters({ view: "unreplied", page: 2, search: "zzz" }),
  ).toMatchObject({ search: "", page: 1 });
  expect(
    withoutHiddenFilters({ view: "unreplied", page: 2, search: "", post: 3 }),
  ).toMatchObject({ post: undefined, page: 1 });
});

it("leaves an address alone that has nothing to drop, and the 全部 view's filters", () => {
  expect(
    withoutHiddenFilters({ view: "unreplied", page: 2, search: "" }),
  ).toBeNull();
  expect(
    withoutHiddenFilters({ view: "all", page: 2, search: "x", post: 3 }),
  ).toBeNull();
});
