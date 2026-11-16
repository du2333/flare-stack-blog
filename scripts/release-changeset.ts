/**
 * release-it's `after:bump` hook: fails the release when the working tree
 * holds anything but the version bump. The gates in `before:init` passed on
 * the tree before the bump, and the release commit runs no git hooks
 * (HUSKY=0 in package.json's release scripts), so the release commit may
 * change package.json and upgrades.json and nothing else: a file a hook
 * regenerated differently, or an untracked file, would reach `dev` unchecked.
 */
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const RELEASE_PATHS = new Set(["package.json", "upgrades.json"]);

/**
 * The paths in `git status --porcelain -z` output; a rename or copy names
 * both its new and its old path.
 */
export function parseStatus(z: string) {
  const entries = z.split("\0").filter((entry) => entry !== "");
  const paths: Array<string> = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    paths.push(entry.slice(3));
    if (/^[RC]/.test(entry) && i + 1 < entries.length) paths.push(entries[++i]);
  }
  return paths;
}

/** The changed paths a release commit must not carry. */
export function unexpectedPaths(paths: Array<string>) {
  return paths.filter((changed) => !RELEASE_PATHS.has(changed));
}

function main() {
  const status = spawnSync(
    "git",
    ["status", "--porcelain", "-z", "--untracked-files=all"],
    { encoding: "utf8" },
  );
  if (status.status !== 0) {
    console.error(`release: git status failed: ${status.stderr}`);
    process.exit(1);
  }
  const unexpected = unexpectedPaths(parseStatus(status.stdout));
  if (unexpected.length > 0) {
    console.error(
      `release: the release commit may change only package.json and upgrades.json, but these changed too:\n${unexpected.map((p) => `  ${p}`).join("\n")}\nThe gates passed on the tree before the bump, so these would be released unchecked. Find what wrote them, commit the fix through acceptance, and release again.`,
    );
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
