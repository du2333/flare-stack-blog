import { describe, expect, it } from "vitest";
import { commentSearchSchema, pageSearchSchema } from "@/lib/public-search";
import { parseSearch, type SearchOutcome } from "@/lib/search-test-utils";

type Case = [label: string, input: unknown, expected: SearchOutcome];

// Home (`/`) and Moments (`/moments`): a page that names no page is no page.
const pageCases: Array<Case> = [
  ["no params", {}, {}],
  ["extra keys are dropped", { page: 2, other: "x" }, { page: 2 }],
  ["a page", { page: 3 }, { page: 3 }],
  ["the last page", { page: 1_000_000 }, { page: 1_000_000 }],
  ["past the last page", { page: 1_000_001 }, {}],
  ["a number as a string", { page: "3" }, { page: 3 }],
  ["a padded number as a string", { page: "07" }, { page: 7 }],
  ["a string past the last page", { page: "1000001" }, {}],
  ["zero", { page: 0 }, {}],
  ["negative", { page: -1 }, {}],
  ["fractional", { page: 1.5 }, {}],
  ["a fraction as a string", { page: "5.5" }, {}],
  ["not a number", { page: "abc" }, {}],
  ["empty string (reads as 0)", { page: "" }, {}],
  ["null (reads as 0)", { page: null }, {}],
  ["true (reads as 1)", { page: true }, { page: 1 }],
  ["a one-item array (reads as 1)", { page: [1] }, { page: 1 }],
  ["an object", { page: {} }, {}],
  ["undefined", { page: undefined }, {}],
];

describe("pageSearchSchema", () => {
  it.each(pageCases)("%s", (_label, input, expected) => {
    expect(parseSearch(pageSearchSchema, input)).toEqual(expected);
  });
});

// A Post (`/post/$slug`) and a Moment (`/moments/$id`): the Comment to scroll to.
const commentCases: Array<Case> = [
  ["no params", {}, {}],
  ["extra keys are dropped", { comment: 4, other: "x" }, { comment: 4 }],
  ["an id", { comment: 12 }, { comment: 12 }],
  ["an id as a string", { comment: "12" }, { comment: 12 }],
  ["a padded id as a string", { comment: "07" }, { comment: 7 }],
  ["zero", { comment: 0 }, { comment: 0 }],
  ["negative", { comment: -1 }, { comment: -1 }],
  ["fractional", { comment: 1.5 }, { comment: 1.5 }],
  ["past a million", { comment: 1_000_001 }, { comment: 1_000_001 }],
  ["not a number", { comment: "abc" }, "throws"],
  ["empty string (reads as 0)", { comment: "" }, { comment: 0 }],
  ["null (reads as 0)", { comment: null }, { comment: 0 }],
  ["true (reads as 1)", { comment: true }, { comment: 1 }],
  ["a one-item array (reads as 1)", { comment: [1] }, { comment: 1 }],
  ["an object", { comment: {} }, "throws"],
  ["undefined", { comment: undefined }, {}],
];

describe("commentSearchSchema", () => {
  it.each(commentCases)("%s", (_label, input, expected) => {
    expect(parseSearch(commentSearchSchema, input)).toEqual(expected);
  });
});
