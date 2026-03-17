import { describe, expect, it } from "vitest";
import { parseWranglerJson } from "./parse-wrangler-json";

describe("parseWranglerJson", () => {
  it("parses trailing JSON after wrangler upload progress logs", () => {
    const output = `
├ Checking if file needs uploading
│
├ 🌀 Uploading test.sql
│ 🌀 Uploading complete.
│
[
  {
    "results": [
      {
        "Total queries executed": 1
      }
    ],
    "success": true
  }
]
`;

    expect(
      parseWranglerJson<
        Array<{
          results: Array<{ "Total queries executed": number }>;
          success: boolean;
        }>
      >(output),
    ).toEqual([
      {
        results: [{ "Total queries executed": 1 }],
        success: true,
      },
    ]);
  });

  it("throws when no valid JSON segment exists", () => {
    expect(() => parseWranglerJson("not json")).toThrow(
      "Failed to parse Wrangler JSON output.",
    );
  });
});
