import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkRelease, inspectDeletion } from "./release-check-core.ts";
import { migrationsAddedSince } from "./release-check-git.ts";

const purge = "DELETE FROM `verification` WHERE `identifier` LIKE 'x%';\n";
const rebuild = `CREATE TABLE posts_new (id integer PRIMARY KEY);
DROP TABLE posts;
ALTER TABLE posts_new RENAME TO posts;
`;

let repo: string;

function git(...args: Array<string>) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  const result = spawnSync(
    "git",
    [
      "-c",
      "user.email=test@example.com",
      "-c",
      "user.name=test",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "tag.gpgsign=false",
      ...args,
    ],
    { cwd: repo, env, encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout;
}

function write(name: string, content: string) {
  mkdirSync(path.dirname(path.join(repo, name)), { recursive: true });
  writeFileSync(path.join(repo, name), content);
}

beforeEach(() => {
  repo = mkdtempSync(path.join(tmpdir(), "release-check-"));
  git("init", "-q", "-b", "main");
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

function commitAll(message: string) {
  git("add", "-A");
  git("commit", "-q", "-m", message);
}

describe("the migrations a release looks at", () => {
  it("are the files added since the last tag, not the ones that shipped", () => {
    write("migrations/0001_old_purge.sql", purge);
    write("migrations/0002_old_rebuild.sql", rebuild);
    commitAll("feat: first release");
    git("tag", "v1.0.0");

    // An edited migration is not added; neither are other files.
    write("migrations/0001_old_purge.sql", `${purge}-- edited\n`);
    write("migrations/meta/_journal.json", "{}");
    write("migrations/0003_new.sql", "ALTER TABLE posts ADD COLUMN x text;\n");
    commitAll("feat: next");

    expect(
      migrationsAddedSince("v1.0.0", repo).map(({ name }) => name),
    ).toEqual(["0003_new.sql"]);
  });

  it("include a new file that resembles one deleted in the same range", () => {
    write("migrations/0001_old_purge.sql", purge);
    commitAll("feat: first release");
    git("tag", "v1.0.0");

    // With rename detection git would report this pair as a rename, and the
    // new migration would escape the check.
    rmSync(path.join(repo, "migrations/0001_old_purge.sql"));
    write("migrations/0002_new_purge.sql", `${purge}-- a comment\n`);
    commitAll("feat: next");

    expect(migrationsAddedSince("v1.0.0", repo)).toEqual([
      { name: "0002_new_purge.sql", sql: `${purge}-- a comment\n` },
    ]);
  });

  it("do not fail the next release because earlier ones delete rows", () => {
    write("migrations/0001_old_purge.sql", purge);
    write("migrations/0002_old_rebuild.sql", rebuild);
    commitAll("feat: first release");
    git("tag", "v1.0.0");
    write("src/feature.ts", "export {};\n");
    commitAll("feat: next");

    const added = migrationsAddedSince("v1.0.0", repo);
    expect(added).toEqual([]);
    expect(
      checkRelease({
        from: "1.0.0",
        to: "1.1.0",
        commits: [],
        file: {
          unreleased: { summary: "新功能。" },
          versions: [{ version: "1.0.0", summary: "首个版本。" }],
        },
        addedMigrations: added,
      }),
    ).toMatchObject({ ok: true, level: "minor" });
  });

  it("fail the release when a new one deletes rows without a keeps-data line", () => {
    write("migrations/0001_old_purge.sql", purge);
    commitAll("feat: first release");
    git("tag", "v1.0.0");
    write("migrations/0002_new_purge.sql", purge);
    commitAll("feat: next");

    const result = checkRelease({
      from: "1.0.0",
      to: "1.1.0",
      commits: [],
      file: {
        unreleased: { summary: "新功能。" },
        versions: [{ version: "1.0.0", summary: "首个版本。" }],
      },
      addedMigrations: migrationsAddedSince("v1.0.0", repo),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain("0002_new_purge.sql");
    expect(result.failures[0]).not.toContain("0001_old_purge.sql");
  });

  it("reads a tag that is not there as an error", () => {
    write("migrations/0001.sql", purge);
    commitAll("feat: first");
    expect(() => migrationsAddedSince("v9.9.9", repo)).toThrow(/v9\.9\.9/);
  });
});

describe("the repository's own migrations", () => {
  it("include ones that delete rows, which only a new migration is held to", () => {
    const migrations = fileURLToPath(new URL("../migrations", import.meta.url));
    const deleting = [
      "0023_drop_password_credentials.sql",
      "0029_unique_name_keys.sql",
    ];
    for (const name of deleting) {
      const verdict = inspectDeletion(
        readFileSync(path.join(migrations, name), "utf8"),
      );
      expect(verdict).toEqual({ deletes: true, marker: "none" });
    }
  });
});
