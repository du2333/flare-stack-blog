/**
 * The release check, run by release-it at `after:bump` (the version is chosen,
 * nothing is committed or tagged yet):
 *
 *   bun scripts/release-check.ts <last version> <new version> [--dry-run]
 *
 * Reads the commits and the migrations added since the tag of the last
 * version, and upgrades.json, then either stops the release with every reason
 * at once or stamps `unreleased` with the new version and moves it to the front
 * of `versions`. release-it's `git add --update` carries the file into the
 * release commit. A prerelease is checked the same way and leaves the file as
 * it is: the file lists releases only. The rules live in release-check-core.ts.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { checkRelease, type AddedMigration } from "./release-check-core.ts";

const HELP = `usage: bun scripts/release-check.ts <last version> <new version> [--dry-run]

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
  if (result.error) throw result.error;
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

/** The tag of the last version; release-it tags `v<version>`. */
function lastTag(from: string) {
  const tag = `v${from}`;
  const found = run("git", ["rev-parse", "-q", "--verify", `refs/tags/${tag}`]);
  if (found.status !== 0) fail(`there is no tag ${tag} to compare against.`);
  return tag;
}

function commitsSince(tag: string) {
  return git(["log", "--format=%B%x00", `${tag}..HEAD`])
    .split("\0")
    .map((message) => message.trim())
    .filter(Boolean);
}

function migrationsAddedSince(tag: string): Array<AddedMigration> {
  return git([
    "diff",
    "--name-only",
    "--diff-filter=A",
    tag,
    "--",
    "migrations",
  ])
    .split("\n")
    .filter((name) => name.endsWith(".sql"))
    .map((name) => ({
      name: path.basename(name),
      sql: readFileSync(path.join(ROOT, name), "utf8"),
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
    fail(`oxfmt could not format upgrades.json: ${result.stderr.trim()}`);
  }
  return result.stdout;
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(HELP);
    return;
  }
  if (positionals.length !== 2) fail(`expected two versions.\n\n${HELP}`, 2);
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
  if (!result.file) {
    console.log(
      `${passed}\nrelease-check: ${to} is a prerelease. upgrades.json lists releases only, so \`unreleased\` stays as it is for the release.`,
    );
    return;
  }
  const formatted = formatJson(result.file);
  if (dryRun) {
    console.log(
      `${passed}\nrelease-check: dry run, nothing written. upgrades.json would start with:\n${JSON.stringify(result.file.versions[0], null, 2)}`,
    );
    return;
  }
  writeFileSync(FILE, formatted);
  console.log(
    `${passed}\nrelease-check: stamped \`unreleased\` as ${to} at the top of upgrades.json.`,
  );
}

main();
