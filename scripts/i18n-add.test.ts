import { describe, expect, it } from "vitest";
import { insertKey } from "./i18n-add.ts";

const file = `{
  "$schema": "https://example.test/schema",
  "a": "one",
  "b": [
    "x",
    "y"
  ],
  "c": "three"
}
`;

describe("insertKey", () => {
  it("inserts right after the anchor and keeps every other line", () => {
    const result = insertKey(file, "new_key", "a", "新");
    expect(Object.keys(JSON.parse(result))).toEqual([
      "$schema",
      "a",
      "new_key",
      "b",
      "c",
    ]);
    expect(result).toContain('  "new_key": "新",\n  "b": [');
  });

  it("goes after a multi-line entry", () => {
    const result = insertKey(file, "new_key", "b", "v");
    expect(Object.keys(JSON.parse(result))).toEqual([
      "$schema",
      "a",
      "b",
      "new_key",
      "c",
    ]);
  });

  it("fixes the commas when the anchor is the last key", () => {
    const result = insertKey(file, "new_key", "c", 'say "hi"');
    expect(JSON.parse(result).new_key).toBe('say "hi"');
    expect(result.endsWith('"new_key": "say \\"hi\\""\n}\n')).toBe(true);
  });

  it("refuses an existing key and a missing anchor", () => {
    expect(() => insertKey(file, "a", "c", "v")).toThrow("already exists");
    expect(() => insertKey(file, "n", "zzz", "v")).toThrow(
      "anchor key not found",
    );
  });
});
