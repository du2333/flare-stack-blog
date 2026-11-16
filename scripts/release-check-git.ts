/**
 * The migrations a release adds, read from git for scripts/release-check.ts.
 *
 * "Added in this release" means the file is in `HEAD` and not in the tree of
 * the last tag (`git diff --diff-filter=A <tag>..HEAD`): a migration that
 * already shipped, an edited one and a renamed one are not added. The marker
 * rules of release-check-core.ts therefore never reach the migrations of
 * earlier releases, some of which delete rows.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import type { AddedMigration } from "./release-check-core.ts";

const HOOK_VARIABLES = new Set(["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE"]);

function git(cwd: string, args: Array<string>) {
  // A hook that runs this (pre-push) sets GIT_DIR and friends for its own repository.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !HOOK_VARIABLES.has(name)),
  );
  const result = spawnSync("git", args, {
    cwd,
    env,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`could not run git: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `\`git ${args.join(" ")}\` exited with ${result.status}: ${result.stderr.trim()}`,
    );
  }
  return result.stdout;
}

/** The `.sql` files under `migrations/` that `tag..HEAD` adds, with their content at `HEAD`. */
export function migrationsAddedSince(
  tag: string,
  cwd: string,
): Array<AddedMigration> {
  return git(cwd, [
    "diff",
    "--name-only",
    "--diff-filter=A",
    `${tag}..HEAD`,
    "--",
    "migrations",
  ])
    .split("\n")
    .filter((name) => name.endsWith(".sql"))
    .map((name) => ({
      name: path.basename(name),
      sql: git(cwd, ["show", `HEAD:${name}`]),
    }));
}
