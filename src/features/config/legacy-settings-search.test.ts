import { describe, expect, it } from "vitest";
import { legacySettingsSearchSchema } from "@/features/config/legacy-settings-search";
import { parseSearch, type SearchOutcome } from "@/lib/search-test-utils";

const cases: Array<[label: string, input: unknown, expected: SearchOutcome]> = [
  ["no params", {}, {}],
  ["extra keys are dropped", { tab: "site", x: 1 }, { tab: "site" }],
  ["site", { tab: "site" }, { tab: "site" }],
  ["email", { tab: "email" }, { tab: "email" }],
  ["webhook", { tab: "webhook" }, { tab: "webhook" }],
  ["api-keys", { tab: "api-keys" }, { tab: "api-keys" }],
  ["maintenance", { tab: "maintenance" }, { tab: "maintenance" }],
  ["undefined", { tab: undefined }, {}],
  ["a tab that does not exist", { tab: "x" }, "throws"],
  ["empty string", { tab: "" }, "throws"],
  ["a number", { tab: 1 }, "throws"],
  ["null", { tab: null }, "throws"],
];

describe("legacySettingsSearchSchema", () => {
  it.each(cases)("%s", (_label, input, expected) => {
    expect(parseSearch(legacySettingsSearchSchema, input)).toEqual(expected);
  });
});
