/**
 * Decides what .husky/pre-push does, from the hook's arguments and the lines
 * git writes to its stdin. It prints one word on stdout for the hook to switch
 * on and its reasons on stderr:
 *
 *   foreign  a remote other than origin: nothing of this repository deploys
 *   local    origin, but no push to dev or main: typecheck only
 *   deploy   origin, a push to dev or main of a commit this working tree has
 *            checked out and clean: typecheck, build, budget, node tests
 *
 * It exits 1 when a deploying push cannot be checked from this working tree,
 * because the build would not be the commit that is pushed.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Pushing to one of these deploys the live blog (Workers Builds). */
const DEPLOY_REFS = new Set(["refs/heads/dev", "refs/heads/main"]);

export type PushLine = {
  localRef: string;
  localSha: string;
  remoteRef: string;
};

export type PushPlan =
  | { kind: "foreign"; message: string }
  | { kind: "local" }
  | { kind: "deploy"; shas: Array<string> };

/** Lines of `<local ref> <local sha> <remote ref> <remote sha>`. */
export function parsePushLines(stdin: string): Array<PushLine> {
  return stdin
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 3 && parts[0] !== "")
    .map(([localRef, localSha, remoteRef]) => ({
      localRef,
      localSha,
      remoteRef,
    }));
}

/** A push that only deletes a ref carries an all-zero local sha. */
function isDeletion(localSha: string) {
  return /^0+$/.test(localSha);
}

export function planPush(remoteName: string, lines: Array<PushLine>): PushPlan {
  if (remoteName !== "origin") {
    return {
      kind: "foreign",
      message: `pre-push: remote "${remoteName}" is not origin, nothing of this repository's production deploys from it, skipping the checks`,
    };
  }
  const shas = lines
    .filter(
      (line) => DEPLOY_REFS.has(line.remoteRef) && !isDeletion(line.localSha),
    )
    .map((line) => line.localSha);
  return shas.length > 0 ? { kind: "deploy", shas } : { kind: "local" };
}

/**
 * Why this working tree cannot stand in for the pushed commits, or undefined.
 * `treeOf` resolves a commit to its tree; a commit that is not here gives undefined.
 */
export function checkoutProblem(input: {
  shas: Array<string>;
  headSha: string;
  headTree: string;
  treeOf: (sha: string) => string | undefined;
  dirty: boolean;
}) {
  for (const sha of input.shas) {
    const tree = input.treeOf(sha);
    if (tree === undefined) {
      return `pre-push: the pushed commit ${sha} is not in this repository; push from the worktree that made it`;
    }
    if (tree !== input.headTree) {
      return `pre-push: this push deploys the live blog, and the build would check the wrong code.\n  pushed commit:      ${sha} (tree ${tree})\n  this working tree:  ${input.headSha} (tree ${input.headTree})\nPush from a worktree that has ${sha} checked out.`;
    }
  }
  if (input.dirty) {
    return `pre-push: this push deploys the live blog, and the working tree has uncommitted changes, so the build would include code that is not being pushed. Commit or stash them first.`;
  }
  return undefined;
}

function git(...args: Array<string>) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function main() {
  const [remoteName = ""] = process.argv.slice(2);
  const plan = planPush(remoteName, parsePushLines(readFileSync(0, "utf8")));

  if (plan.kind === "foreign") {
    console.error(plan.message);
  } else if (plan.kind === "deploy") {
    const problem = checkoutProblem({
      shas: plan.shas,
      headSha: git("rev-parse", "HEAD") ?? "HEAD",
      headTree: git("rev-parse", "HEAD^{tree}") ?? "",
      treeOf: (sha) => git("rev-parse", "--verify", "--quiet", `${sha}^{tree}`),
      dirty: (git("status", "--porcelain") ?? "") !== "",
    });
    if (problem) {
      console.error(problem);
      process.exit(1);
    }
  }
  console.log(plan.kind);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
