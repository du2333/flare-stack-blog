import { describe, expect, it } from "vitest";
import {
  adminCommentsSearchSchema,
  withoutHiddenFilters,
} from "@/features/comments/admin-comments-search";
import { parseSearch, type SearchOutcome } from "@/lib/search-test-utils";

const defaults = { view: "unreplied", page: 1, search: "" };
const withDefaults = (given: Record<string, unknown>) => ({
  ...defaults,
  ...given,
});

// Every key falls back on its own to its default; nothing here throws.
const cases: Array<[label: string, input: unknown, expected: SearchOutcome]> = [
  ["no params", {}, defaults],
  ["extra keys are dropped", { page: 2, x: 1 }, withDefaults({ page: 2 })],
  [
    "everything",
    { view: "all", page: 2, search: "s", post: 7 },
    { view: "all", page: 2, search: "s", post: 7 },
  ],
  ["view unreplied", { view: "unreplied" }, defaults],
  ["view all", { view: "all" }, withDefaults({ view: "all" })],
  ["a view that does not exist", { view: "x" }, defaults],
  ["a view that is no string", { view: 1 }, defaults],
  ["a search", { search: "abc" }, withDefaults({ search: "abc" })],
  [
    "a search of 200 characters",
    { search: "a".repeat(200) },
    withDefaults({ search: "a".repeat(200) }),
  ],
  ["a search of 201 characters", { search: "a".repeat(201) }, defaults],
  ["a search that is no string", { search: 5 }, defaults],
  ["a page", { page: 4 }, withDefaults({ page: 4 })],
  [
    "past a million (no limit)",
    { page: 1_000_001 },
    withDefaults({ page: 1_000_001 }),
  ],
  ["a page as a string", { page: "2" }, defaults],
  ["page zero", { page: 0 }, defaults],
  ["a negative page", { page: -1 }, defaults],
  ["a fractional page", { page: 1.5 }, defaults],
  ["a page that is no number", { page: "abc" }, defaults],
  ["null page", { page: null }, defaults],
  ["true as the page", { page: true }, defaults],
  ["a post", { post: 3 }, withDefaults({ post: 3 })],
  ["a post as a string", { post: "3" }, defaults],
  ["post zero", { post: 0 }, defaults],
  ["a negative post", { post: -1 }, defaults],
  ["a fractional post", { post: 1.5 }, defaults],
  ["a post that is no number", { post: "abc" }, defaults],
  ["null post", { post: null }, defaults],
];

describe("adminCommentsSearchSchema", () => {
  it.each(cases)("%s", (_label, input, expected) => {
    expect(parseSearch(adminCommentsSearchSchema, input)).toEqual(expected);
  });
});

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
