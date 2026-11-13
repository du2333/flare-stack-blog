import { describe, expect, it } from "vitest";
import { adminPostsSearchSchema } from "@/features/posts/admin-posts-search";
import { parseSearch, type SearchOutcome } from "@/lib/search-test-utils";

const defaults = {
  page: 1,
  status: "ALL",
  sortBy: "updatedAt",
  search: "",
};
const withDefaults = (given: Record<string, unknown>) => ({
  ...defaults,
  ...given,
});

// Every key falls back on its own to its default or to none; nothing here throws.
const cases: Array<[label: string, input: unknown, expected: SearchOutcome]> = [
  ["no params", {}, defaults],
  ["extra keys are dropped", { page: 2, x: 1 }, withDefaults({ page: 2 })],
  [
    "everything",
    {
      page: 2,
      status: "DRAFT",
      sortBy: "viewCount",
      search: "s",
      category: 4,
      tag: 5,
    },
    {
      page: 2,
      status: "DRAFT",
      sortBy: "viewCount",
      search: "s",
      category: 4,
      tag: 5,
    },
  ],
  ["status ALL", { status: "ALL" }, defaults],
  [
    "status PUBLISHED",
    { status: "PUBLISHED" },
    withDefaults({ status: "PUBLISHED" }),
  ],
  [
    "status CHANGED",
    { status: "CHANGED" },
    withDefaults({ status: "CHANGED" }),
  ],
  ["status DRAFT", { status: "DRAFT" }, withDefaults({ status: "DRAFT" })],
  ["a status that does not exist", { status: "x" }, defaults],
  ["a status in lower case", { status: "draft" }, defaults],
  ["a status that is no string", { status: 1 }, defaults],
  [
    "sort by publishedAt",
    { sortBy: "publishedAt" },
    withDefaults({ sortBy: "publishedAt" }),
  ],
  ["sort by updatedAt", { sortBy: "updatedAt" }, defaults],
  [
    "sort by viewCount",
    { sortBy: "viewCount" },
    withDefaults({ sortBy: "viewCount" }),
  ],
  [
    "sort by commentCount",
    { sortBy: "commentCount" },
    withDefaults({ sortBy: "commentCount" }),
  ],
  [
    "a sort the API has but the list has not",
    { sortBy: "createdAt" },
    defaults,
  ],
  ["a sort that does not exist", { sortBy: "x" }, defaults],
  ["a search", { search: "abc" }, withDefaults({ search: "abc" })],
  [
    "a long search (no limit)",
    { search: "a".repeat(500) },
    withDefaults({ search: "a".repeat(500) }),
  ],
  ["a search that is no string", { search: 5 }, defaults],
  ["a page", { page: 4 }, withDefaults({ page: 4 })],
  ["a page as a string", { page: "2" }, defaults],
  ["page zero", { page: 0 }, defaults],
  ["a negative page", { page: -1 }, defaults],
  ["a fractional page", { page: 1.5 }, defaults],
  ["a page that is no number", { page: "abc" }, defaults],
  ["null page", { page: null }, defaults],
  ["true as the page", { page: true }, defaults],
  ["a category", { category: 3 }, withDefaults({ category: 3 })],
  ["no category", { category: "none" }, withDefaults({ category: "none" })],
  ["a category as a string", { category: "3" }, defaults],
  ["category zero", { category: 0 }, defaults],
  ["a negative category", { category: -1 }, defaults],
  ["a fractional category", { category: 1.5 }, defaults],
  ["a category that is another string", { category: "x" }, defaults],
  ["null category", { category: null }, defaults],
  ["a tag", { tag: 3 }, withDefaults({ tag: 3 })],
  ["a tag as a string", { tag: "3" }, defaults],
  ["tag zero", { tag: 0 }, defaults],
  ["a negative tag", { tag: -1 }, defaults],
  ["a fractional tag", { tag: 1.5 }, defaults],
  ["tag none (only a category takes it)", { tag: "none" }, defaults],
  ["null tag", { tag: null }, defaults],
];

describe("adminPostsSearchSchema", () => {
  it.each(cases)("%s", (_label, input, expected) => {
    expect(parseSearch(adminPostsSearchSchema, input)).toEqual(expected);
  });
});
