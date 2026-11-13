/**
 * Decides what .husky/pre-push does, from the hook's arguments and the lines
 * git writes to its stdin. It prints one word on stdout for the hook to switch
 * on and its reasons on stderr:
 *
 *   foreign  the push goes to a repository other than origin's (compared by
 *            URL, not by remote name): nothing of its production deploys
 *   local    to origin's repository, but not to dev or main: typecheck only
 *   deploy   to origin's repository (or there is no origin to compare with),
 *            dev or main, of a commit this working tree has checked out and
 *            clean: typecheck, build, budget, node tests
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

/**
 * A repository's address in one spelling: lower-cased `host/path` without the
 * scheme, credentials, port, trailing slash or `.git`. Understands https, ssh,
 * git, file and scp-like (`git@host:owner/repo`) forms and plain paths. The
 * path is lower-cased too: for hosts where case matters that can only make two
 * repositories look the same, which keeps the checks on.
 */
export function normalizeRepoUrl(raw: string) {
  const url = raw.trim();
  let host = "";
  let repoPath: string;
  const withScheme = /^([a-z][a-z0-9+.-]*):\/\/(.*)$/i.exec(url);
  const scpLike = /^(?:[^@/:]+@)?([^@:/]+):(.*)$/.exec(url);
  if (withScheme) {
    const rest = withScheme[2];
    if (withScheme[1].toLowerCase() === "file") {
      repoPath = rest;
    } else {
      const slash = rest.indexOf("/");
      const authority = slash < 0 ? rest : rest.slice(0, slash);
      repoPath = slash < 0 ? "" : rest.slice(slash);
      host = authority
        .slice(authority.lastIndexOf("@") + 1)
        .replace(/:\d*$/, "");
    }
  } else if (scpLike) {
    host = scpLike[1];
    repoPath = `/${scpLike[2]}`;
  } else {
    repoPath = url;
  }
  const cleaned = repoPath
    .replace(/\/+/g, "/")
    .replace(/\/+$/, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");
  return `${host}${cleaned}`.toLowerCase();
}

/**
 * `pushUrl` is the hook's second argument, where the push goes (git passes the
 * URL itself when a push names no remote); `originUrl` is origin's push URL,
 * undefined when the repository has no origin remote, and then no push is
 * foreign.
 */
export function planPush(
  pushUrl: string | undefined,
  originUrl: string | undefined,
  lines: Array<PushLine>,
): PushPlan {
  if (
    pushUrl &&
    originUrl &&
    normalizeRepoUrl(pushUrl) !== normalizeRepoUrl(originUrl)
  ) {
    return {
      kind: "foreign",
      message: `pre-push: ${normalizeRepoUrl(pushUrl)} is not origin's repository, nothing of this repository's production deploys from it, skipping the checks`,
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
  // The hook's arguments are the remote's name and its URL.
  const plan = planPush(
    process.argv[3],
    git("remote", "get-url", "--push", "origin"),
    parsePushLines(readFileSync(0, "utf8")),
  );

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
