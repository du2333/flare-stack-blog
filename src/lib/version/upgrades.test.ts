import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";
import { compareAppVersions, parseAppVersion } from "./app-version";
import {
  entriesBetween,
  latestReleasedVersion,
  MAX_UPGRADE_LIST_ITEMS,
  MAX_UPGRADE_TEXT_LENGTH,
  MAX_UPGRADE_VERSIONS,
  parseUpgradesFile,
  upgradesFile,
} from "./upgrades";

const valid = {
  unreleased: {
    summary: "下一版的摘要。",
    before: [{ id: "secrets-as-secret", text: "以 Secret 类型重新添加变量" }],
  },
  versions: [
    {
      version: "4.0.0",
      summary: "大版本。",
      before: [{ id: "build-command", text: "修改 Build command" }],
      after: [{ id: "check-settings", text: "检查设置" }],
      requires: { buildVars: ["UPGRADE_ACK"], secrets: ["BETTER_AUTH_URL"] },
      rollback: "unsafe",
    },
    { version: "3.13.0", summary: "新功能。", rollback: "safe" },
    { version: "3.12.1", summary: "修复。" },
  ],
};

describe("parseUpgradesFile", () => {
  it("accepts a valid file and keeps every field", () => {
    expect(parseUpgradesFile(valid)).toEqual(valid);
  });

  it("accepts a file without unreleased and with no versions", () => {
    expect(parseUpgradesFile({ versions: [] })).toEqual({ versions: [] });
  });

  it("accepts an unreleased entry, which has no version", () => {
    const file = parseUpgradesFile(valid);
    expect(file?.unreleased).toEqual(valid.unreleased);
    expect(
      parseUpgradesFile({
        ...valid,
        unreleased: { ...valid.unreleased, version: "4.1.0" },
      }),
    ).toBeNull();
  });

  it("refuses a text over the limit and accepts one at it", () => {
    const at = "字".repeat(MAX_UPGRADE_TEXT_LENGTH);
    const withSummary = (summary: string) => ({
      versions: [{ version: "3.12.1", summary }],
    });
    expect(parseUpgradesFile(withSummary(at))).not.toBeNull();
    expect(parseUpgradesFile(withSummary(`${at}字`))).toBeNull();
    expect(
      parseUpgradesFile({
        versions: [
          {
            version: "3.12.1",
            summary: "修复。",
            after: [{ id: "long", text: `${at}字` }],
          },
        ],
      }),
    ).toBeNull();
  });

  it("refuses a missing or blank summary", () => {
    expect(parseUpgradesFile({ versions: [{ version: "3.12.1" }] })).toBeNull();
    expect(
      parseUpgradesFile({ versions: [{ version: "3.12.1", summary: "  " }] }),
    ).toBeNull();
    expect(
      parseUpgradesFile({ unreleased: { before: [] }, versions: [] }),
    ).toBeNull();
  });

  it("refuses versions that are not strictly newest first", () => {
    const entry = (version: string) => ({ version, summary: "摘要。" });
    expect(
      parseUpgradesFile({ versions: [entry("3.12.1"), entry("3.13.0")] }),
    ).toBeNull();
    expect(
      parseUpgradesFile({ versions: [entry("3.12.1"), entry("3.12.1")] }),
    ).toBeNull();
    expect(
      parseUpgradesFile({ versions: [entry("3.13.0"), entry("3.12.1")] }),
    ).not.toBeNull();
  });

  it.each(["3.12", "v3.12.1", "3.13.0-beta.0", "03.1.0", "", 3])(
    "refuses the version %j",
    (version) => {
      expect(
        parseUpgradesFile({ versions: [{ version, summary: "摘要。" }] }),
      ).toBeNull();
    },
  );

  it("refuses unknown keys rather than dropping them", () => {
    expect(parseUpgradesFile({ ...valid, extra: true })).toBeNull();
    expect(
      parseUpgradesFile({
        versions: [{ version: "3.12.1", summary: "修复。", befor: [] }],
      }),
    ).toBeNull();
  });

  it("bounds the number of entries and of items", () => {
    const versions = Array.from(
      { length: MAX_UPGRADE_VERSIONS + 1 },
      (_, i) => ({
        version: `1.0.${MAX_UPGRADE_VERSIONS - i}`,
        summary: "摘要。",
      }),
    );
    expect(parseUpgradesFile({ versions })).toBeNull();
    expect(parseUpgradesFile({ versions: versions.slice(1) })).not.toBeNull();

    const before = Array.from(
      { length: MAX_UPGRADE_LIST_ITEMS + 1 },
      (_, i) => ({
        id: `item-${i}`,
        text: "事项",
      }),
    );
    expect(
      parseUpgradesFile({
        unreleased: { summary: "摘要。", before },
        versions: [],
      }),
    ).toBeNull();
  });

  it("refuses repeated item ids, malformed ids and malformed names", () => {
    const withUnreleased = (unreleased: unknown) =>
      parseUpgradesFile({ unreleased, versions: [] });
    expect(
      withUnreleased({
        summary: "摘要。",
        before: [
          { id: "a", text: "一" },
          { id: "a", text: "二" },
        ],
      }),
    ).toBeNull();
    expect(
      withUnreleased({
        summary: "摘要。",
        after: [{ id: "Not ok", text: "一" }],
      }),
    ).toBeNull();
    expect(
      withUnreleased({
        summary: "摘要。",
        requires: { buildVars: ["NOT OK"], secrets: [] },
      }),
    ).toBeNull();
    expect(withUnreleased({ summary: "摘要。", rollback: "maybe" })).toBeNull();
  });

  it.each([null, undefined, "{}", [], { versions: "3.12.1" }])(
    "refuses %j",
    (input) => {
      expect(parseUpgradesFile(input)).toBeNull();
    },
  );
});

describe("latestReleasedVersion", () => {
  it("is the first entry's version, or null for an empty list", () => {
    expect(latestReleasedVersion(parseUpgradesFile(valid)!)).toBe("4.0.0");
    expect(latestReleasedVersion({ versions: [] })).toBeNull();
  });
});

describe("entriesBetween", () => {
  const file = parseUpgradesFile({
    versions: ["4.1.0", "4.0.0", "3.13.1", "3.13.0", "3.12.1"].map(
      (version) => ({ version, summary: `${version} 摘要。` }),
    ),
  })!;
  const versions = (from: string, to: string) =>
    entriesBetween(file, from, to).map((entry) => entry.version);

  it("lists the entries after from up to and including to, oldest first", () => {
    expect(versions("3.12.1", "4.1.0")).toEqual([
      "3.13.0",
      "3.13.1",
      "4.0.0",
      "4.1.0",
    ]);
    expect(versions("3.13.0", "4.0.0")).toEqual(["3.13.1", "4.0.0"]);
  });

  it("is empty when nothing lies between", () => {
    expect(versions("4.1.0", "4.1.0")).toEqual([]);
    expect(versions("4.1.0", "3.12.1")).toEqual([]);
    expect(versions("5.0.0", "6.0.0")).toEqual([]);
  });

  it("places a prerelease before its release", () => {
    expect(versions("3.13.0-beta.0", "3.13.1")).toEqual(["3.13.0", "3.13.1"]);
    expect(versions("3.12.1", "4.0.0-beta.1")).toEqual(["3.13.0", "3.13.1"]);
  });

  it("throws on an invalid version", () => {
    expect(() => entriesBetween(file, "nope", "4.1.0")).toThrow();
  });
});

describe("upgradesFile", () => {
  // A prerelease is not listed, so its build carries the last release on top.
  it("is the repository's file and lists the current release first", () => {
    const current = parseAppVersion(packageJson.version)!;
    const latest = latestReleasedVersion(upgradesFile)!;
    if (current.prerelease.length === 0) {
      expect(latest).toBe(packageJson.version);
    } else {
      expect(compareAppVersions(latest, packageJson.version)).toBe(-1);
    }
  });
});
