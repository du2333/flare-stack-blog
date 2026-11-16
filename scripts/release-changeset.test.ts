import { describe, expect, it } from "vitest";
import { parseStatus, unexpectedPaths } from "./release-changeset.ts";

describe("parseStatus", () => {
  it("reads porcelain -z entries, both paths of a rename", () => {
    expect(
      parseStatus(
        " M package.json\0?? new file.ts\0R  to.ts\0from.ts\0M  upgrades.json\0",
      ),
    ).toEqual([
      "package.json",
      "new file.ts",
      "to.ts",
      "from.ts",
      "upgrades.json",
    ]);
  });

  it("reads nothing from a clean tree", () => {
    expect(parseStatus("")).toEqual([]);
  });
});

describe("unexpectedPaths", () => {
  it("allows the version bump alone", () => {
    expect(unexpectedPaths(["package.json", "upgrades.json"])).toEqual([]);
    expect(unexpectedPaths(["package.json"])).toEqual([]);
  });

  it("names anything else, untracked files and nested package.json included", () => {
    expect(
      unexpectedPaths([
        "package.json",
        "src/lib/orpc/contract.generated.json",
        "scratch.txt",
        "packages/x/package.json",
      ]),
    ).toEqual([
      "src/lib/orpc/contract.generated.json",
      "scratch.txt",
      "packages/x/package.json",
    ]);
  });
});
