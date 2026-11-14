import { describe, expect, it } from "vitest";
import {
  breakingCommits,
  checkRelease,
  inspectMigration,
  isBreakingCommit,
  scanSql,
  type Commit,
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

let next = 0;
/** A commit with a fresh 40-character sha. */
function commit(message: string, sha?: string): Commit {
  next += 1;
  return { sha: sha ?? next.toString(16).padStart(40, "0"), message };
}

function input(overrides: Partial<ReleaseCheckInput> = {}): ReleaseCheckInput {
  return {
    from: "3.12.1",
    to: "3.13.0",
    commits: [
      commit("feat(posts): add drafts"),
      commit("fix: typo\n\nbody text"),
    ],
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
    "fix: tidy\n\nA body paragraph.\n\nRefs: #12\nBREAKING CHANGE: gone",
  ])("finds %j breaking", (message) => {
    expect(isBreakingCommit(message)).toBe(true);
  });

  it.each([
    "feat: add drafts",
    "fix(auth): handle a missing secret!",
    "fix(a(b))!: nested parentheses are not a scope",
    "feat(a\nb)!: a scope across lines",
    "merge: feat/x into dev",
    "fix: tidy\n\nfeat!: a marker in the body",
    "docs: explain what a BREAKING CHANGE: footer means",
    "fix: tidy\n\nNot a BREAKING CHANGE: inline",
    "fix: tidy\n\nBREAKING CHANGE: in the body, not the footer\n\nRefs: #12",
  ])("finds %j not breaking", (message) => {
    expect(isBreakingCommit(message)).toBe(false);
  });
});

describe("breakingCommits", () => {
  const breaking = commit("feat(api)!: remove v1", "a".repeat(40));
  const revert = commit(
    `Revert "feat(api)!: remove v1"\n\nThis reverts commit ${"a".repeat(40)}.`,
    "b".repeat(40),
  );

  it("drops a breaking commit that a later commit reverts", () => {
    expect(breakingCommits([revert, breaking])).toEqual([]);
  });

  it("keeps it when the revert is reverted, or names another commit", () => {
    const reapply = commit(
      `Revert "Revert ..."\n\nThis reverts commit ${"b".repeat(40)}.`,
    );
    expect(breakingCommits([reapply, revert, breaking])).toEqual([breaking]);
    const other = commit(`Revert x\n\nThis reverts commit ${"c".repeat(40)}.`);
    expect(breakingCommits([other, breaking])).toEqual([breaking]);
  });

  it("does not count a revert of a commit outside the range as breaking", () => {
    expect(checkRelease(input({ commits: [revert] }))).toMatchObject({
      ok: true,
    });
  });
});

describe("inspectMigration", () => {
  it("ignores keywords in comments, strings and identifiers", () => {
    const sql = `-- DROP the old index later
/* RENAME
   block */
INSERT INTO notes (body) VALUES ('please DROP by'), ('it''s RENAME');
CREATE TABLE "drop" (id integer, \`rename\` text, [drop] text);
`;
    expect(scanSql(sql).code).not.toMatch(/DROP|RENAME/i);
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

  it("reads the rollback-safe line comment and its reason", () => {
    expect(
      inspectMigration(
        `-- rollback-safe: same columns after the rebuild\n${rebuild}`,
      ),
    ).toMatchObject({ marker: "reason" });
    expect(
      inspectMigration(`${rebuild}DROP INDEX a; --rollback-safe: unused index`),
    ).toMatchObject({ marker: "reason" });
    expect(inspectMigration(`-- rollback-safe:   \n${rebuild}`)).toMatchObject({
      marker: "empty",
    });
  });

  it("does not count a marker inside a block comment or a string", () => {
    expect(
      inspectMigration(`/*\n-- rollback-safe: hidden\n*/\n${rebuild}`),
    ).toMatchObject({ marker: "none" });
    expect(
      inspectMigration(
        `INSERT INTO notes VALUES ('\n-- rollback-safe: hidden\n');\n${rebuild}`,
      ),
    ).toMatchObject({ marker: "none" });
  });
});

describe("checkRelease", () => {
  it("passes a minor and stamps unreleased onto the front of versions", () => {
    const result = checkRelease(input());
    expect(result).toEqual({
      ok: true,
      base: "3.12.1",
      level: "minor",
      outcome: "stamp",
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
        commits: [commit("feat(auth)!: require a secret")],
        file: { unreleased, versions: released },
      }),
    );
    if (!result.ok) throw new Error(result.failures.join("\n"));
    expect(result.level).toBe("major");
    const [entry] = result.file!.versions;
    expect(entry).toEqual({ version: "4.0.0", ...unreleased });
    expect(Object.keys(entry).slice(0, 2)).toEqual(["version", "summary"]);
  });

  it("passes a patch", () => {
    expect(checkRelease(input({ to: "3.12.2" }))).toMatchObject({
      ok: true,
      level: "patch",
    });
  });

  it("passes a rerun once the file is already stamped", () => {
    const file = {
      versions: [{ version: "3.13.0", summary: "新增草稿功能。" }, ...released],
    };
    expect(checkRelease(input({ file }))).toEqual({
      ok: true,
      base: "3.12.1",
      level: "minor",
      outcome: "already-stamped",
      file: null,
    });
    // A major stamped without `before` still fails on the rerun.
    expect(
      failures({
        to: "4.0.0",
        file: {
          versions: [{ version: "4.0.0", summary: "大。" }, ...released],
        },
      }),
    ).toEqual([expect.stringContaining("has no `before` items")]);
  });

  it("fails a breaking commit in a release that is not a major", () => {
    const [failure] = failures({
      commits: [
        commit("feat: add drafts"),
        commit("feat(api)!: remove v1"),
        commit("fix: x\n\nBREAKING CHANGE: y"),
      ],
    });
    expect(failure).toContain(
      "2 commits since the last tag are marked breaking",
    );
    expect(failure).toContain("3.12.1 → 3.13.0 is a minor");
    expect(failure).toContain("feat(api)!: remove v1");
    expect(failure).toContain("fix: x");
  });

  it("fails when unreleased is missing", () => {
    expect(failures({ file: { versions: released } })).toEqual([
      expect.stringContaining("has no `unreleased` entry"),
    ]);
  });

  it("fails when unreleased has no summary, which the schema allows", () => {
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

  describe("required configuration", () => {
    const withRequires = (requires: object, fields: object = {}) => ({
      unreleased: { summary: "摘要。", requires, ...fields },
      versions: released,
    });

    it("fails a minor that requires a Secret", () => {
      expect(
        failures({
          file: withRequires({ buildVars: [], secrets: ["BETTER_AUTH_URL"] }),
        }),
      ).toEqual([
        "`unreleased` in upgrades.json requires BETTER_AUTH_URL, but 3.12.1 → 3.13.0 is a minor. Required configuration belongs in a major: make it optional, or release a major.",
      ]);
    });

    it("passes a minor whose requires lists are empty", () => {
      expect(
        checkRelease(
          input({ file: withRequires({ buildVars: [], secrets: [] }) }),
        ),
      ).toMatchObject({ ok: true, level: "minor" });
    });

    it("passes a major with requirements", () => {
      expect(
        checkRelease(
          input({
            to: "4.0.0",
            file: withRequires(
              { buildVars: ["UPGRADE_ACK"], secrets: ["BETTER_AUTH_URL"] },
              { before: [{ id: "a", text: "一" }] },
            ),
          }),
        ),
      ).toMatchObject({ ok: true, level: "major" });
    });

    it("follows the level a prerelease is measured at", () => {
      const file = withRequires({ buildVars: ["X"], secrets: [] });
      expect(failures({ to: "3.13.0-beta.0", file })).toEqual([
        expect.stringContaining("requires X"),
      ]);
    });

    it("is reported with the other failures", () => {
      expect(
        failures({
          commits: [commit("feat!: break")],
          file: withRequires({ buildVars: ["UPGRADE_ACK"], secrets: ["S"] }),
          addedMigrations: [{ name: "0035_rebuild.sql", sql: rebuild }],
        }),
      ).toEqual([
        expect.stringContaining("marked breaking"),
        expect.stringContaining("requires UPGRADE_ACK, S"),
        expect.stringContaining("Migration 0035_rebuild.sql"),
      ]);
    });
  });

  it("reports every failure at once", () => {
    const result = failures({
      commits: [commit("feat!: break")],
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

  it("reports a schema problem with the summary, before and migration failures", () => {
    const result = failures({
      to: "4.0.0",
      commits: [commit("feat!: break")],
      file: {
        unreleased: { after: [{ id: "a", text: "一" }] },
        versions: [{ ...released[0], befor: [] }, released[1]],
      },
    });
    // The breaking commit is allowed in a major; the rest all show.
    expect(result).toEqual([
      expect.stringMatching(
        /does not match its schema:\n {2}versions\.0: .*befor/,
      ),
      expect.stringContaining("has no `summary`"),
      expect.stringContaining("has no `before` items"),
    ]);

    const minor = failures({
      commits: [commit("feat!: break")],
      file: { unreleased: { summary: "x", befor: [] }, versions: released },
      addedMigrations: [{ name: "0035_rebuild.sql", sql: rebuild }],
    });
    expect(minor).toEqual([
      expect.stringContaining("does not match its schema"),
      expect.stringContaining("marked breaking"),
      expect.stringContaining("Migration 0035_rebuild.sql"),
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
        outcome: "prerelease",
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
          commits: [commit("feat!: break")],
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
