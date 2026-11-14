/**
 * The release check, run by release-it at `before:bump` (the version is
 * chosen; package.json is not written yet and nothing is committed or tagged):
 *
 *   bun scripts/release-check.ts <last version> <new version> [--dry-run]
 *
 * Reads the commits and the migrations added in `v<last>..HEAD`, and
 * upgrades.json, then either stops the release with every reason at once or
 * stamps `unreleased` with the new version and moves it to the front of
 * `versions`. release-it's `git add --update` carries the file into the
 * release commit. A rerun after the stamp was written passes as "already
 * stamped". A prerelease is checked the same way and leaves the file as it is:
 * the file lists releases only. The rules live in release-check-core.ts.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual, parseArgs } from "node:util";
import {
  checkRelease,
  type AddedMigration,
  type Commit,
} from "./release-check-core.ts";

const USAGE =
  "usage: bun scripts/release-check.ts <last version> <new version> [--dry-run]";

const HELP = `${USAGE}

Stops the release when a commit since the last tag is breaking and the release
is not a major, when upgrades.json has no \`unreleased\` summary, when a major has
no \`before\` items, or when a migration added in a non-major uses DROP or RENAME
without a \`-- rollback-safe: <reason>\` line. Otherwise stamps \`unreleased\`
with the new version (not for a prerelease).

  --dry-run   print the verdict and write nothing
  --help`;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "upgrades.json");

function fail(message: string, code = 1): never {
  console.error(`release-check: ${message}`);
  process.exit(code);
}

function run(command: string, args: Array<string>, stdin?: string) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    input: stdin,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    fail(`could not run ${command}: ${result.error.message}`);
  }
  return result;
}

function git(args: Array<string>) {
  const result = run("git", args);
  if (result.status !== 0) {
    fail(
      `\`git ${args.join(" ")}\` exited with ${result.status}: ${result.stderr.trim()}`,
    );
  }
  return result.stdout;
}

/** The tag of the last version (release-it tags `v<version>`), checked to bound a real range. */
function lastTag(from: string) {
  const tag = `v${from}`;
  if (git(["rev-parse", "--is-shallow-repository"]).trim() === "true") {
    fail(
      "this clone is shallow, so the commits since the last tag are incomplete. Run `git fetch --unshallow --tags` and try again.",
    );
  }
  const found = run("git", ["rev-parse", "-q", "--verify", `refs/tags/${tag}`]);
  if (found.status !== 0) {
    fail(`there is no tag ${tag}. Run \`git fetch --tags\` and try again.`);
  }
  const ancestor = run("git", ["merge-base", "--is-ancestor", tag, "HEAD"]);
  if (ancestor.status !== 0) {
    fail(
      `${tag} is not an ancestor of HEAD, so \`${tag}..HEAD\` is not this release. Release from a branch that contains ${tag} (merge it in first).`,
    );
  }
  return tag;
}

function commitsSince(tag: string): Array<Commit> {
  return git(["log", "--format=%H%x00%B%x1e", `${tag}..HEAD`])
    .split("\x1e")
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const split = record.indexOf("\0");
      return {
        sha: record.slice(0, split),
        message: record.slice(split + 1).trim(),
      };
    });
}

function migrationsAddedSince(tag: string): Array<AddedMigration> {
  return git([
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
      sql: git(["show", `HEAD:${name}`]),
    }));
}

function readUpgradesFile(): unknown {
  try {
    return JSON.parse(readFileSync(FILE, "utf8"));
  } catch (error) {
    return fail(
      `upgrades.json cannot be read as JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/** JSON in the repository's formatting, so `oxfmt --check` stays green. */
function formatJson(value: unknown) {
  const oxfmt = path.join(ROOT, "node_modules", ".bin", "oxfmt");
  const result = run(
    oxfmt,
    ["--stdin-filepath=upgrades.json"],
    `${JSON.stringify(value, null, 2)}\n`,
  );
  if (result.status !== 0) {
    fail(
      `oxfmt could not format upgrades.json (exit ${result.status}): ${result.stderr.trim()}. upgrades.json is unchanged.`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    parsed = undefined;
  }
  if (!isDeepStrictEqual(parsed, value)) {
    fail(
      "oxfmt returned something other than the stamped upgrades.json. upgrades.json is unchanged.",
    );
  }
  return result.stdout;
}

/** Through a temporary file and a rename, so the file is never half written. */
function writeAtomically(content: string) {
  const temporary = `${FILE}.${process.pid}.tmp`;
  try {
    writeFileSync(temporary, content);
    renameSync(temporary, FILE);
  } catch (error) {
    rmSync(temporary, { force: true });
    fail(
      `could not write upgrades.json: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function options() {
  try {
    return parseArgs({
      allowPositionals: true,
      options: {
        "dry-run": { type: "boolean", default: false },
        help: { type: "boolean", default: false },
      },
    });
  } catch (error) {
    return fail(
      `${error instanceof Error ? error.message : String(error)}\n${USAGE}`,
      2,
    );
  }
}

function main() {
  const { values, positionals } = options();
  if (values.help) {
    console.log(HELP);
    return;
  }
  if (positionals.length !== 2) fail(`expected two versions.\n${USAGE}`, 2);
  const [from, to] = positionals as [string, string];
  const dryRun = values["dry-run"];

  const tag = lastTag(from);
  const result = checkRelease({
    from,
    to,
    commits: commitsSince(tag),
    file: readUpgradesFile(),
    addedMigrations: migrationsAddedSince(tag),
  });

  if (!result.ok) {
    console.error(
      `release-check: ${from} → ${to} cannot be released:\n\n${result.failures
        .map((failure) => `- ${failure.replaceAll("\n", "\n  ")}`)
        .join("\n\n")}\n`,
    );
    process.exit(1);
  }

  const passed = `release-check: ${result.base} → ${to} is a ${result.level}; every check passed.`;
  switch (result.outcome) {
    case "prerelease":
      console.log(
        `${passed}\nrelease-check: ${to} is a prerelease. upgrades.json lists releases only, so \`unreleased\` stays as it is for the release.`,
      );
      return;
    case "already-stamped":
      console.log(
        `${passed}\nrelease-check: upgrades.json already lists ${to} first; already stamped, nothing to write.`,
      );
      return;
    case "stamp": {
      const formatted = formatJson(result.file);
      if (dryRun) {
        console.log(
          `${passed}\nrelease-check: dry run, nothing written. upgrades.json would start with:\n${JSON.stringify(result.file!.versions[0], null, 2)}`,
        );
        return;
      }
      writeAtomically(formatted);
      console.log(
        `${passed}\nrelease-check: stamped \`unreleased\` as ${to} at the top of upgrades.json.`,
      );
      return;
    }
    default:
      result.outcome satisfies never;
  }
}

main();
