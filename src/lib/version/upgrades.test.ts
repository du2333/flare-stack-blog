import { describe, expect, it, vi } from "vitest";
import packageJson from "../../../package.json";
import committedFile from "../../../upgrades.json";
import { compareAppVersions, parseAppVersion } from "./app-version";
import {
  checkUpgradesFile,
  entriesBetween,
  latestReleasedVersion,
  MAX_UPGRADE_LIST_ITEMS,
  MAX_UPGRADE_TEXT_LENGTH,
  MAX_UPGRADE_VERSIONS,
  ownUpgradesFile,
  parseUpgradesFile,
  stampUnreleased,
} from "./upgrades";

const released = [
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
];

const valid = {
  unreleased: {
    summary: "下一版的摘要。",
    before: [{ id: "secrets-as-secret", text: "以 Secret 类型重新添加变量" }],
  },
  versions: released,
};

const entry = (version: unknown, fields: object = {}) => ({
  version,
  summary: "摘要。",
  ...fields,
});

/** Whether each validation accepts the input. */
const validations = [
  ["checkUpgradesFile", (input: unknown) => checkUpgradesFile(input).ok],
  ["parseUpgradesFile", (input: unknown) => parseUpgradesFile(input) !== null],
] as const;

describe.each(validations)("%s, on what both refuse", (_, accepts) => {
  it("accepts a valid file and a file with no versions", () => {
    expect(accepts(valid)).toBe(true);
    expect(accepts({ versions: [] })).toBe(true);
  });

  it("refuses a text over the limit and accepts one at it", () => {
    const at = "字".repeat(MAX_UPGRADE_TEXT_LENGTH);
    expect(accepts({ versions: [entry("3.12.1", { summary: at })] })).toBe(
      true,
    );
    expect(
      accepts({ versions: [entry("3.12.1", { summary: `${at}字` })] }),
    ).toBe(false);
    expect(
      accepts({
        versions: [entry("3.12.1", { after: [{ id: "a", text: `${at}字` }] })],
      }),
    ).toBe(false);
  });

  it("refuses a released entry with a missing or blank summary", () => {
    expect(accepts({ versions: [{ version: "3.12.1" }] })).toBe(false);
    expect(accepts({ versions: [entry("3.12.1", { summary: "  " })] })).toBe(
      false,
    );
  });

  it("refuses versions that are not strictly newest first", () => {
    expect(accepts({ versions: [entry("3.12.1"), entry("3.13.0")] })).toBe(
      false,
    );
    expect(accepts({ versions: [entry("3.12.1"), entry("3.12.1")] })).toBe(
      false,
    );
    expect(accepts({ versions: [entry("3.13.0"), entry("3.12.1")] })).toBe(
      true,
    );
  });

  it.each(["3.12", "v3.12.1", "3.13.0-beta.0", "03.1.0", "", 3])(
    "refuses the version %j",
    (version) => {
      expect(accepts({ versions: [entry(version)] })).toBe(false);
    },
  );

  it("refuses a list beyond its limit, repeated ids and malformed names", () => {
    const items = Array.from(
      { length: MAX_UPGRADE_LIST_ITEMS + 1 },
      (_, i) => ({
        id: `item-${i}`,
        text: "事项",
      }),
    );
    const withFields = (fields: object) => ({
      versions: [entry("3.12.1", fields)],
    });
    expect(accepts(withFields({ before: items.slice(1) }))).toBe(true);
    expect(accepts(withFields({ before: items }))).toBe(false);
    expect(
      accepts(
        withFields({
          after: [
            { id: "a", text: "一" },
            { id: "a", text: "二" },
          ],
        }),
      ),
    ).toBe(false);
    expect(accepts(withFields({ after: [{ id: "Not ok", text: "一" }] }))).toBe(
      false,
    );
    expect(
      accepts(withFields({ requires: { buildVars: ["NOT OK"], secrets: [] } })),
    ).toBe(false);
    expect(accepts(withFields({ requires: { secrets: [] } }))).toBe(false);
  });

  it.each([null, undefined, "{}", [], {}, { versions: "3.12.1" }])(
    "refuses %j",
    (input) => {
      expect(accepts(input)).toBe(false);
    },
  );
});

describe("checkUpgradesFile", () => {
  it("returns the file with every field, unreleased included", () => {
    expect(checkUpgradesFile(valid)).toEqual({ ok: true, file: valid });
  });

  it("accepts an unreleased entry without a summary", () => {
    const file = {
      unreleased: { before: valid.unreleased.before },
      versions: [],
    };
    expect(checkUpgradesFile(file)).toEqual({ ok: true, file });
  });

  it("refuses unknown keys at every level and says where", () => {
    expect(checkUpgradesFile({ ...valid, extra: true })).toEqual({
      ok: false,
      problems: [expect.stringContaining("extra")],
    });
    const result = checkUpgradesFile({
      versions: [entry("3.12.1", { befor: [] })],
    });
    expect(result).toEqual({
      ok: false,
      problems: [expect.stringMatching(/^versions\.0: .*befor/)],
    });
    expect(
      checkUpgradesFile({
        unreleased: { summary: "x", version: "4.1.0" },
        versions: [],
      }).ok,
    ).toBe(false);
  });

  it("refuses an unknown rollback value and more than the version limit", () => {
    expect(
      checkUpgradesFile({ versions: [entry("3.12.1", { rollback: "maybe" })] })
        .ok,
    ).toBe(false);
    const versions = Array.from({ length: MAX_UPGRADE_VERSIONS + 1 }, (_, i) =>
      entry(`1.0.${MAX_UPGRADE_VERSIONS - i}`),
    );
    expect(checkUpgradesFile({ versions }).ok).toBe(false);
    expect(checkUpgradesFile({ versions: versions.slice(1) }).ok).toBe(true);
  });

  it("passes the committed upgrades.json", () => {
    expect(checkUpgradesFile(committedFile)).toMatchObject({ ok: true });
  });
});

describe("parseUpgradesFile", () => {
  it("returns the released entries and never unreleased", () => {
    expect(parseUpgradesFile(valid)).toEqual({ versions: released });
    expect(parseUpgradesFile(valid)).not.toHaveProperty("unreleased");
  });

  it("ignores a broken unreleased entirely", () => {
    expect(
      parseUpgradesFile({
        unreleased: { summary: 3, before: "x".repeat(10_000), version: "nope" },
        versions: released,
      }),
    ).toEqual({ versions: released });
    expect(parseUpgradesFile({ unreleased: "x", versions: [] })).toEqual({
      versions: [],
    });
  });

  it("strips unknown keys at every level", () => {
    expect(
      parseUpgradesFile({
        extra: true,
        versions: [
          entry("3.12.1", {
            link: "https://example.com",
            before: [{ id: "a", text: "一", severity: "high" }],
            requires: { buildVars: [], secrets: ["S"], kv: ["K"] },
          }),
        ],
      }),
    ).toEqual({
      versions: [
        entry("3.12.1", {
          before: [{ id: "a", text: "一" }],
          requires: { buildVars: [], secrets: ["S"] },
        }),
      ],
    });
  });

  it("reads an unknown rollback value as absent", () => {
    const file = parseUpgradesFile({
      versions: [entry("3.12.1", { rollback: "partial" })],
    });
    expect(file).toEqual({ versions: [entry("3.12.1")] });
    expect(file!.versions[0]).not.toHaveProperty("rollback");
  });

  it("keeps the newest MAX_UPGRADE_VERSIONS entries of a longer list", () => {
    const versions = Array.from({ length: MAX_UPGRADE_VERSIONS + 5 }, (_, i) =>
      entry(`1.0.${MAX_UPGRADE_VERSIONS + 5 - i}`),
    );
    // An entry past the limit is not even looked at.
    versions.push({ version: "bad" } as never);
    const file = parseUpgradesFile({ versions });
    expect(file!.versions).toHaveLength(MAX_UPGRADE_VERSIONS);
    expect(file!.versions[0].version).toBe(`1.0.${MAX_UPGRADE_VERSIONS + 5}`);
    expect(file!.versions.at(-1)!.version).toBe("1.0.6");
  });
});

describe("latestReleasedVersion", () => {
  it("is the first entry's version, or null for an empty list", () => {
    expect(latestReleasedVersion(parseUpgradesFile(valid)!)).toBe("4.0.0");
    expect(latestReleasedVersion({ versions: [] })).toBeNull();
  });
});

describe("entriesBetween", () => {
  const file = parseUpgradesFile({
    versions: ["4.1.0", "4.0.0", "3.13.1", "3.13.0", "3.12.1"].map((version) =>
      entry(version),
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

  it("is empty for a file with no versions", () => {
    expect(entriesBetween({ versions: [] }, "3.12.1", "4.0.0")).toEqual([]);
  });

  it("places a prerelease before its release", () => {
    expect(versions("3.13.0-beta.0", "3.13.1")).toEqual(["3.13.0", "3.13.1"]);
    expect(versions("3.12.1", "4.0.0-beta.1")).toEqual(["3.13.0", "3.13.1"]);
  });

  it("throws on an invalid version, even when no comparison is reached", () => {
    expect(() => entriesBetween(file, "nope", "4.1.0")).toThrow();
    expect(() => entriesBetween(file, "3.12.1", "nope")).toThrow();
    expect(() => entriesBetween({ versions: [] }, "nope", "4.1.0")).toThrow();
    expect(() => entriesBetween({ versions: [] }, "3.12.1", "")).toThrow();
  });
});

describe("stampUnreleased", () => {
  it("moves unreleased to the front with the version first", () => {
    const stamped = stampUnreleased(
      {
        unreleased: { rollback: "safe", summary: "新功能。" },
        versions: [{ version: "3.12.1", summary: "摘要。" }],
      },
      "3.13.0",
    );
    expect(stamped).toEqual({
      versions: [
        { version: "3.13.0", summary: "新功能。", rollback: "safe" },
        entry("3.12.1"),
      ],
    });
    expect(Object.keys(stamped.versions[0])).toEqual([
      "version",
      "summary",
      "rollback",
    ]);
  });

  it("throws without an unreleased summary", () => {
    expect(() => stampUnreleased({ versions: [] }, "3.13.0")).toThrow();
    expect(() =>
      stampUnreleased({ unreleased: {}, versions: [] }, "3.13.0"),
    ).toThrow();
  });
});

describe("ownUpgradesFile", () => {
  // A prerelease is not listed, so its build carries the last release on top.
  it("is the repository's file and lists the current release first", () => {
    const current = parseAppVersion(packageJson.version)!;
    const latest = latestReleasedVersion(ownUpgradesFile())!;
    if (current.prerelease.length === 0) {
      expect(latest).toBe(packageJson.version);
    } else {
      expect(compareAppVersions(latest, packageJson.version)).toBe(-1);
    }
    expect(ownUpgradesFile()).toBe(ownUpgradesFile());
  });

  it("imports without parsing or throwing, and reads a refused file as empty", async () => {
    vi.resetModules();
    vi.doMock("../../../upgrades.json", () => ({
      default: { versions: [{ version: "not a version" }] },
    }));
    try {
      const module = await import("./upgrades");
      expect(module.ownUpgradesFile()).toEqual({ versions: [] });
    } finally {
      vi.doUnmock("../../../upgrades.json");
      vi.resetModules();
    }
  });
});

describe("ownUnreleasedEntry", () => {
  async function withFile(
    file: unknown,
    test: (module: typeof import("./upgrades")) => void,
  ) {
    vi.resetModules();
    vi.doMock("../../../upgrades.json", () => ({ default: file }));
    try {
      test(await import("./upgrades"));
    } finally {
      vi.doUnmock("../../../upgrades.json");
      vi.resetModules();
    }
  }

  it("reads the build's unreleased entry leniently, once", async () => {
    await withFile(
      {
        unreleased: {
          summary: "第四版。",
          before: [{ id: "backup", text: "备份 D1 数据库" }],
          requires: { buildVars: [], secrets: ["BETTER_AUTH_URL"] },
          rollback: "someday",
          later: true,
        },
        versions: [],
      },
      (module) => {
        expect(module.ownUnreleasedEntry()).toEqual({
          summary: "第四版。",
          before: [{ id: "backup", text: "备份 D1 数据库" }],
          requires: { buildVars: [], secrets: ["BETTER_AUTH_URL"] },
        });
        expect(module.ownUnreleasedEntry()).toBe(module.ownUnreleasedEntry());
      },
    );
  });

  it("is null when there is no entry or it is not usable", async () => {
    await withFile({ versions: [] }, (module) => {
      expect(module.ownUnreleasedEntry()).toBeNull();
    });
    await withFile(
      { unreleased: { before: "backup" }, versions: [] },
      (module) => {
        expect(module.ownUnreleasedEntry()).toBeNull();
      },
    );
  });
});
