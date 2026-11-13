import { describe, expect, it } from "vitest";
import { mediaSearchSchema } from "@/features/media/media-search";
import { parseSearch, type SearchOutcome } from "@/lib/search-test-utils";

// Every key falls back on its own; nothing here throws.
const cases: Array<[label: string, input: unknown, expected: SearchOutcome]> = [
  ["no params", {}, {}],
  ["extra keys are dropped", { view: "list", x: 1 }, { view: "list" }],
  [
    "everything",
    { view: "list", unused: true, search: "cat", sort: "oldest" },
    { view: "list", unused: true, search: "cat", sort: "oldest" },
  ],
  ["view grid", { view: "grid" }, { view: "grid" }],
  ["view list", { view: "list" }, { view: "list" }],
  ["a view that does not exist", { view: "x" }, {}],
  ["a view that is no string", { view: 1 }, {}],
  ["unused true", { unused: true }, { unused: true }],
  ["unused false", { unused: false }, { unused: false }],
  ["unused as the string true", { unused: "true" }, { unused: false }],
  ["unused as the string false", { unused: "false" }, { unused: false }],
  ["unused as a number", { unused: 1 }, { unused: false }],
  ["unused null", { unused: null }, { unused: false }],
  ["a search", { search: "abc" }, { search: "abc" }],
  ["an empty search", { search: "" }, { search: "" }],
  ["a long search", { search: "a".repeat(500) }, { search: "a".repeat(500) }],
  ["a search that is no string", { search: 5 }, {}],
  ["sort newest", { sort: "newest" }, { sort: "newest" }],
  ["sort oldest", { sort: "oldest" }, { sort: "oldest" }],
  ["sort largest", { sort: "largest" }, { sort: "largest" }],
  ["a sort that does not exist", { sort: "x" }, {}],
  ["a sort that is no string", { sort: 1 }, {}],
];

describe("mediaSearchSchema", () => {
  it.each(cases)("%s", (_label, input, expected) => {
    expect(parseSearch(mediaSearchSchema, input)).toEqual(expected);
  });
});
