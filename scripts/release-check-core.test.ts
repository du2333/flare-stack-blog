import { describe, expect, it } from "vitest";
import {
  checkRelease,
  inspectMigration,
  isBreakingCommit,
  sqlCode,
  type ReleaseCheckInput,
} from "./release-check-core.ts";

const released = [
  { version: "3.12.1", summary: "修复。" },
  { version: "3.12.0", summary: "新功能。" },
];

const rebuild = `CREATE TABLE posts_new (id integer PRIMARY KEY);
INSERT INTO posts_new SELECT id FROM posts;
DROP TABLE posts;
ALTER TABLE posts_new RENAME TO posts;
`;

function input(overrides: Partial<ReleaseCheckInput> = {}): ReleaseCheckInput {
  return {
    from: "3.12.1",
    to: "3.13.0",
    commits: ["feat(posts): add drafts", "fix: typo\n\nbody text"],
    file: { unreleased: { summary: "新增草稿功能。" }, versions: released },
    addedMigrations: [],
    ...overrides,
  };
}

function failures(overrides: Partial<ReleaseCheckInput>) {
  const result = checkRelease(input(overrides));
  if (result.ok) throw new Error("expected the check to fail");
  return result.failures;
}

describe("isBreakingCommit", () => {
  it.each([
    "feat!: drop the old API",
    "feat(auth)!: require a secret",
    "refactor(db)!: rename columns\n\nbody",
    "fix: tidy\n\nBREAKING CHANGE: the old route is gone",
    "fix: tidy\n\nBREAKING-CHANGE: the old route is gone",
  ])("finds %j breaking", (message) => {
    expect(isBreakingCommit(message)).toBe(true);
  });

  it.each([
    "feat: add drafts",
    "fix(auth): handle a missing secret!",
    "merge: feat/x into dev",
    "docs: explain what a BREAKING CHANGE: footer means",
    "fix: tidy\n\nNot a BREAKING CHANGE: inline",
  ])("finds %j not breaking", (message) => {
    expect(isBreakingCommit(message)).toBe(false);
  });
});

describe("inspectMigration", () => {
  it("ignores keywords in comments, strings and identifiers", () => {
    const sql = `-- DROP the old index later
/* RENAME
   block */
INSERT INTO notes (body) VALUES ('please DROP by'), ('it''s RENAME');
CREATE TABLE "drop" (id integer);
`;
    expect(sqlCode(sql)).not.toMatch(/DROP|RENAME/i);
    expect(inspectMigration(sql)).toEqual({ destructive: false });
  });

  it("finds DROP and RENAME as SQL, whatever the case", () => {
    expect(inspectMigration(rebuild)).toEqual({
      destructive: true,
      keywords: ["DROP", "RENAME"],
      marker: "none",
    });
    expect(inspectMigration("drop index idx_posts;")).toMatchObject({
      keywords: ["DROP"],
    });
  });

  it("reads the rollback-safe line and its reason", () => {
    expect(
      inspectMigration(
        `-- rollback-safe: same columns after the rebuild\n${rebuild}`,
      ),
    ).toMatchObject({ marker: "reason" });
    expect(inspectMigration(`-- rollback-safe:   \n${rebuild}`)).toMatchObject({
      marker: "empty",
    });
  });
});

describe("checkRelease", () => {
  it("passes a minor and stamps unreleased onto the front of versions", () => {
    const result = checkRelease(input());
    expect(result).toEqual({
      ok: true,
      base: "3.12.1",
      level: "minor",
      prerelease: false,
      file: {
        versions: [
          { version: "3.13.0", summary: "新增草稿功能。" },
          ...released,
        ],
      },
    });
    expect(result.ok && "unreleased" in result.file!).toBe(false);
  });

  it("stamps every field of unreleased and puts the version first", () => {
    const unreleased = {
      rollback: "unsafe",
      after: [{ id: "build-command", text: "修改 Build command" }],
      before: [{ id: "secrets-as-secret", text: "以 Secret 类型重新添加" }],
      requires: { buildVars: [], secrets: ["BETTER_AUTH_URL"] },
      summary: "大版本。",
    };
    const result = checkRelease(
      input({
        to: "4.0.0",
        commits: ["feat(auth)!: require a secret"],
        file: { unreleased, versions: released },
      }),
    );
    if (!result.ok) throw new Error(result.failures.join("\n"));
    expect(result.level).toBe("major");
    const [entry] = result.file!.versions;
    expect(entry).toEqual({ version: "4.0.0", ...unreleased });
    expect(Object.keys(entry)[0]).toBe("version");
  });

  it("passes a patch", () => {
    expect(checkRelease(input({ to: "3.12.2" }))).toMatchObject({
      ok: true,
      level: "patch",
    });
  });

  it("fails a breaking commit in a release that is not a major", () => {
    const [failure] = failures({
      commits: [
        "feat: add drafts",
        "feat(api)!: remove v1",
        "fix: x\n\nBREAKING CHANGE: y",
      ],
    });
    expect(failure).toContain("2 commits since 3.12.1 are marked breaking");
    expect(failure).toContain("3.12.1 → 3.13.0 is a minor");
    expect(failure).toContain("feat(api)!: remove v1");
    expect(failure).toContain("fix: x");
  });

  it("fails when unreleased is missing", () => {
    expect(failures({ file: { versions: released } })).toEqual([
      expect.stringContaining("has no `unreleased` entry"),
    ]);
  });

  it("fails when unreleased has no summary", () => {
    expect(
      failures({
        file: {
          unreleased: { before: [{ id: "a", text: "一" }] },
          versions: released,
        },
      }),
    ).toEqual([expect.stringContaining("has no `summary`")]);
  });

  it("fails a major whose unreleased has no before items", () => {
    expect(failures({ to: "4.0.0" })).toEqual([
      expect.stringContaining(
        "This release is a major (3.12.1 → 4.0.0), and `unreleased` in upgrades.json has no `before` items",
      ),
    ]);
  });

  it("fails a migration with DROP or RENAME and no reason in a non-major", () => {
    const result = failures({
      addedMigrations: [
        { name: "0035_rebuild.sql", sql: rebuild },
        { name: "0036_empty.sql", sql: `-- rollback-safe:\n${rebuild}` },
        { name: "0037_add.sql", sql: "ALTER TABLE posts ADD COLUMN x text;" },
        {
          name: "0038_ok.sql",
          sql: `-- rollback-safe: the rebuilt table keeps every column\n${rebuild}`,
        },
      ],
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toContain(
      "Migration 0035_rebuild.sql uses DROP and RENAME",
    );
    expect(result[0]).toContain("no `-- rollback-safe: <reason>` line");
    expect(result[1]).toContain("0036_empty.sql");
    expect(result[1]).toContain("gives no reason");
  });

  it("lets a major carry DROP and RENAME without a marker", () => {
    expect(
      checkRelease(
        input({
          to: "4.0.0",
          file: {
            unreleased: {
              summary: "大版本。",
              before: [{ id: "a", text: "一" }],
            },
            versions: released,
          },
          addedMigrations: [{ name: "0035_rebuild.sql", sql: rebuild }],
        }),
      ),
    ).toMatchObject({ ok: true, level: "major" });
  });

  it("reports every failure at once", () => {
    const result = failures({
      commits: ["feat!: break"],
      file: { versions: [{ version: "3.12.0", summary: "旧。" }] },
      addedMigrations: [{ name: "0035_rebuild.sql", sql: rebuild }],
    });
    expect(result).toEqual([
      expect.stringContaining("marked breaking"),
      expect.stringContaining("lists 3.12.0 as the newest release"),
      expect.stringContaining("has no `unreleased` entry"),
      expect.stringContaining("Migration 0035_rebuild.sql"),
    ]);
  });

  it("reports schema problems and still checks the commits", () => {
    const result = failures({
      commits: ["feat!: break"],
      file: { unreleased: { summary: "x", befor: [] }, versions: released },
    });
    expect(result).toEqual([
      expect.stringContaining("upgrades.json does not match its schema"),
      expect.stringContaining("marked breaking"),
    ]);
  });

  it("fails a version that does not move forward or does not parse", () => {
    expect(failures({ to: "3.12.1" })).toEqual([
      "3.12.1 does not come after 3.12.1; nothing to release.",
    ]);
    expect(failures({ to: "next" })).toEqual([
      'The new version "next" is not a version.',
    ]);
  });

  describe("a prerelease", () => {
    it("is checked the same way but leaves the file as it is", () => {
      expect(checkRelease(input({ to: "3.13.0-beta.0" }))).toEqual({
        ok: true,
        base: "3.12.1",
        level: "minor",
        prerelease: true,
        file: null,
      });
      expect(
        failures({ to: "4.0.0-beta.0", file: { versions: released } }),
      ).toEqual([expect.stringContaining("has no `unreleased` entry")]);
    });

    it("measures the level from the last release, not from the last prerelease", () => {
      const file = {
        unreleased: { summary: "大版本。" },
        versions: released,
      };
      // 4.0.0-beta.0 → 4.0.0-beta.1 and → 4.0.0 are both still a major over 3.12.1.
      expect(
        failures({ from: "4.0.0-beta.0", to: "4.0.0-beta.1", file }),
      ).toEqual([expect.stringContaining("(3.12.1 → 4.0.0-beta.1)")]);
      const result = checkRelease(
        input({
          from: "4.0.0-beta.1",
          to: "4.0.0",
          commits: ["feat!: break"],
          file: {
            ...file,
            unreleased: {
              ...file.unreleased,
              before: [{ id: "a", text: "一" }],
            },
          },
        }),
      );
      expect(result).toMatchObject({
        ok: true,
        base: "3.12.1",
        level: "major",
      });
      expect(result.ok && result.file!.versions[0].version).toBe("4.0.0");
    });
  });
});
