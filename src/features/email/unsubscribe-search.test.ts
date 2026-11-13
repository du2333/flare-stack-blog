import { describe, expect, it } from "vitest";
import { unsubscribeSearchSchema } from "@/features/email/unsubscribe-search";
import { parseSearch, type SearchOutcome } from "@/lib/search-test-utils";

const link = { userId: "u1", type: "reply_notification", token: "t1" };

const cases: Array<[label: string, input: unknown, expected: SearchOutcome]> = [
  ["no params", {}, {}],
  ["a whole link", link, link],
  ["extra keys are dropped", { ...link, x: 1 }, link],
  ["only the user", { userId: "u1" }, { userId: "u1" }],
  ["only the token", { token: "t1" }, { token: "t1" }],
  [
    "only the type",
    { type: "reply_notification" },
    { type: "reply_notification" },
  ],
  [
    "empty strings stay",
    { userId: "", type: "reply_notification", token: "" },
    { userId: "", type: "reply_notification", token: "" },
  ],
  ["undefined", { userId: undefined, type: undefined }, {}],
  ["a type that does not exist", { ...link, type: "other" }, "throws"],
  ["a type that is no string", { type: 1 }, "throws"],
  ["null type", { type: null }, "throws"],
  ["a number as the user", { userId: 5 }, "throws"],
  ["a number as the token", { token: 5 }, "throws"],
  ["null token", { token: null }, "throws"],
];

describe("unsubscribeSearchSchema", () => {
  it.each(cases)("%s", (_label, input, expected) => {
    expect(parseSearch(unsubscribeSearchSchema, input)).toEqual(expected);
  });
});
