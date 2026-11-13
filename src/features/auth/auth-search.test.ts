import { describe, expect, it } from "vitest";
import {
  legacyAuthSearchSchema,
  loginSearchSchema,
} from "@/features/auth/auth-search";
import { parseSearch, type SearchOutcome } from "@/lib/search-test-utils";

type Case = [label: string, input: unknown, expected: SearchOutcome];

// `/login` rejects a `redirectTo` that is no string; the old entry points
// (`/register`, `/forgot-password`, `/reset-link`, `/verify-email`) drop it.
const cases: Array<[...Case, legacy: SearchOutcome]> = [
  ["no params", {}, {}, {}],
  [
    "extra keys are dropped",
    { redirectTo: "/a", x: 1 },
    { redirectTo: "/a" },
    { redirectTo: "/a" },
  ],
  [
    "an address",
    { redirectTo: "/admin" },
    { redirectTo: "/admin" },
    { redirectTo: "/admin" },
  ],
  ["empty string", { redirectTo: "" }, { redirectTo: "" }, { redirectTo: "" }],
  ["undefined", { redirectTo: undefined }, {}, {}],
  ["a number", { redirectTo: 5 }, "throws", {}],
  ["null", { redirectTo: null }, "throws", {}],
  ["true", { redirectTo: true }, "throws", {}],
  ["an array", { redirectTo: ["/a"] }, "throws", {}],
  ["an object", { redirectTo: {} }, "throws", {}],
];

describe("loginSearchSchema", () => {
  it.each(cases)("%s", (_label, input, expected) => {
    expect(parseSearch(loginSearchSchema, input)).toEqual(expected);
  });
});

describe("legacyAuthSearchSchema", () => {
  it.each(cases)("%s", (_label, input, _login, expected) => {
    expect(parseSearch(legacyAuthSearchSchema, input)).toEqual(expected);
  });
});
