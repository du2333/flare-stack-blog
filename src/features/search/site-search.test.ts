import { describe, expect, it } from "vitest";
import { siteSearchSchema } from "@/features/search/site-search";
import { parseSearch, type SearchOutcome } from "@/lib/search-test-utils";

const cases: Array<[label: string, input: unknown, expected: SearchOutcome]> = [
  ["no params", {}, {}],
  ["extra keys are dropped", { q: "a", x: 1 }, { q: "a" }],
  ["a query", { q: "hello" }, { q: "hello" }],
  ["empty string", { q: "" }, { q: "" }],
  ["undefined", { q: undefined }, {}],
  ["a number", { q: 5 }, "throws"],
  ["null", { q: null }, "throws"],
  ["true", { q: true }, "throws"],
  ["an array", { q: ["a"] }, "throws"],
  ["an object", { q: {} }, "throws"],
];

describe("siteSearchSchema", () => {
  it.each(cases)("%s", (_label, input, expected) => {
    expect(parseSearch(siteSearchSchema, input)).toEqual(expected);
  });

  // The route calls `parse` itself, so an invalid address throws there too.
  it("throws from parse on an invalid address", () => {
    expect(() => siteSearchSchema.parse({ q: 5 })).toThrow();
    expect(siteSearchSchema.parse({ q: "a" })).toEqual({ q: "a" });
  });
});
