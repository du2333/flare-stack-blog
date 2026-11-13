import { describe, expect, it } from "vitest";
import { adminFriendLinksSearchSchema } from "@/features/friend-links/admin-friend-links-search";
import { parseSearch, type SearchOutcome } from "@/lib/search-test-utils";

const defaults = { search: "", status: "pending", page: 1 };
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
    { search: "a", status: "approved", page: 3 },
    { search: "a", status: "approved", page: 3 },
  ],
  ["status pending", { status: "pending" }, defaults],
  [
    "status approved",
    { status: "approved" },
    withDefaults({ status: "approved" }),
  ],
  [
    "status rejected",
    { status: "rejected" },
    withDefaults({ status: "rejected" }),
  ],
  ["a status that does not exist", { status: "x" }, defaults],
  ["a status that is no string", { status: 1 }, defaults],
  ["null status", { status: null }, defaults],
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
  ["zero", { page: 0 }, defaults],
  ["negative", { page: -1 }, defaults],
  ["fractional", { page: 1.5 }, defaults],
  ["not a number", { page: "abc" }, defaults],
  ["null", { page: null }, defaults],
  ["true", { page: true }, defaults],
  ["an object", { page: {} }, defaults],
];

describe("adminFriendLinksSearchSchema", () => {
  it.each(cases)("%s", (_label, input, expected) => {
    expect(parseSearch(adminFriendLinksSearchSchema, input)).toEqual(expected);
  });
});
