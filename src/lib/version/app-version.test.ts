import { describe, expect, it } from "vitest";
import {
  appVersionLevel,
  compareAppVersions,
  formatAppVersion,
  parseAppVersion,
} from "./app-version";

describe("parseAppVersion", () => {
  it.each([
    ["3.12.1", { major: 3, minor: 12, patch: 1, prerelease: [] }],
    ["v3.12.1", { major: 3, minor: 12, patch: 1, prerelease: [] }],
    ["0.0.0", { major: 0, minor: 0, patch: 0, prerelease: [] }],
    [
      "3.13.0-beta.0",
      { major: 3, minor: 13, patch: 0, prerelease: ["beta", 0] },
    ],
    [
      "v3.13.0-rc.1.x-y",
      { major: 3, minor: 13, patch: 0, prerelease: ["rc", 1, "x-y"] },
    ],
    ["1.0.0-0", { major: 1, minor: 0, patch: 0, prerelease: [0] }],
    ["1.0.0-0a", { major: 1, minor: 0, patch: 0, prerelease: ["0a"] }],
  ])("parses %s", (input, expected) => {
    expect(parseAppVersion(input)).toEqual(expected);
  });

  it.each([
    "",
    "v",
    "3",
    "3.12",
    "3.12.1.4",
    "03.12.1",
    "3.12.01",
    "3.12.1-",
    "3.12.1-beta.",
    "3.12.1-.beta",
    "3.12.1-beta..1",
    "3.12.1-01",
    "3.12.1-beta.01",
    "3.12.1-be_ta",
    "3.12.1+build.5",
    "3.12.1-beta.1+build.5",
    "vv3.12.1",
    " 3.12.1",
    "3.12.1 ",
    "release-3.12.1",
    "99999999999999999999.0.0",
    "1.0.0-99999999999999999999",
  ])("refuses %j", (input) => {
    expect(parseAppVersion(input)).toBeNull();
  });
});

describe("formatAppVersion", () => {
  it.each(["3.12.1", "3.13.0-beta.0", "1.0.0-rc.1.x-y"])(
    "round-trips %s",
    (input) => {
      expect(formatAppVersion(parseAppVersion(input)!)).toBe(input);
    },
  );

  it("drops a leading v", () => {
    expect(formatAppVersion(parseAppVersion("v3.12.1")!)).toBe("3.12.1");
  });
});

describe("compareAppVersions", () => {
  it.each([
    // releases against releases
    ["1.5.2", "1.5.2", 0],
    ["1.5.2", "1.5.3", -1],
    ["1.5.3", "1.5.2", 1],
    ["1.5.9", "1.6.0", -1],
    ["1.10.0", "1.9.0", 1],
    ["2.0.0", "1.99.99", 1],
    ["v1.5.2", "1.5.2", 0],
    // prereleases against releases
    ["3.13.0-beta.0", "3.13.0", -1],
    ["3.13.0", "3.13.0-beta.0", 1],
    ["3.13.0-beta.0", "3.12.1", 1],
    ["3.13.0-beta.0", "3.12.9", 1],
    ["3.13.0-rc.9", "3.14.0", -1],
    // prereleases against each other
    ["3.13.0-beta.0", "3.13.0-beta.0", 0],
    ["3.13.0-alpha", "3.13.0-beta", -1],
    ["3.13.0-beta.2", "3.13.0-beta.10", -1],
    ["3.13.0-beta.11", "3.13.0-beta.2", 1],
    ["3.13.0-beta", "3.13.0-beta.0", -1],
    ["3.13.0-beta.0", "3.13.0-beta", 1],
    ["3.13.0-1", "3.13.0-alpha", -1],
    ["3.13.0-alpha", "3.13.0-1", 1],
    ["3.13.0-alpha.1", "3.13.0-alpha.beta", -1],
    ["3.13.0-Beta", "3.13.0-alpha", -1],
    ["3.13.0-beta.1", "3.13.1-alpha.0", -1],
    // the ordering from the semver specification
    ["1.0.0-alpha", "1.0.0-alpha.1", -1],
    ["1.0.0-alpha.1", "1.0.0-alpha.beta", -1],
    ["1.0.0-alpha.beta", "1.0.0-beta", -1],
    ["1.0.0-beta", "1.0.0-beta.2", -1],
    ["1.0.0-beta.2", "1.0.0-beta.11", -1],
    ["1.0.0-beta.11", "1.0.0-rc.1", -1],
    ["1.0.0-rc.1", "1.0.0", -1],
  ] as const)("compares %s with %s as %i", (a, b, expected) => {
    expect(compareAppVersions(a, b)).toBe(expected);
  });

  it.each([
    ["not-a-version", "1.0.0"],
    ["1.0.0", "1.0"],
    ["1.0.0+build", "1.0.0"],
  ])("throws on invalid input (%s, %s)", (a, b) => {
    expect(() => compareAppVersions(a, b)).toThrow(
      /Invalid application version/,
    );
  });
});

describe("appVersionLevel", () => {
  it.each([
    ["1.5.2", "1.5.3", "patch"],
    ["1.5.2", "1.6.0", "minor"],
    ["1.5.2", "2.0.0", "major"],
    ["1.5.2", "2.3.4", "major"],
    ["1.5.2", "1.7.9", "minor"],
    ["v1.5.2", "v1.5.3", "patch"],
    // only the prerelease part differs: a patch-sized step
    ["3.13.0-beta.0", "3.13.0", "patch"],
    ["3.13.0-beta.0", "3.13.0-beta.1", "patch"],
    // the highest differing component wins over the prerelease
    ["3.12.1", "3.13.0-beta.0", "minor"],
    ["3.12.1", "4.0.0-rc.1", "major"],
    ["3.13.0-beta.0", "3.14.0", "minor"],
    // not after: equal and downgrades have no level
    ["1.5.2", "1.5.2", null],
    ["1.5.2", "1.5.1", null],
    ["2.0.0", "1.9.9", null],
    ["3.13.0", "3.13.0-beta.0", null],
    ["3.13.0-beta.1", "3.13.0-beta.0", null],
    ["3.13.0-beta.0", "3.12.1", null],
  ] as const)("from %s to %s is %s", (from, to, expected) => {
    expect(appVersionLevel(from, to)).toBe(expected);
  });

  it("throws on invalid input", () => {
    expect(() => appVersionLevel("1.0", "1.0.1")).toThrow(
      /Invalid application version/,
    );
    expect(() => appVersionLevel("1.0.0", "latest")).toThrow(
      /Invalid application version/,
    );
  });
});
