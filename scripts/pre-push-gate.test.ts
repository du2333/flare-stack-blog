import { describe, expect, it } from "vitest";
import { checkoutProblem, parsePushLines, planPush } from "./pre-push-gate.ts";

const SHA = "a".repeat(40);
const ZERO = "0".repeat(40);

function lines(...pairs: Array<[local: string, remote: string, sha?: string]>) {
  return parsePushLines(
    pairs
      .map(
        ([local, remote, sha = SHA]) => `${local} ${sha} ${remote} ${ZERO}\n`,
      )
      .join(""),
  );
}

describe("parsePushLines", () => {
  it("reads git's four columns and ignores blank lines", () => {
    expect(
      parsePushLines(`refs/heads/x ${SHA} refs/heads/dev ${ZERO}\n\n`),
    ).toEqual([
      { localRef: "refs/heads/x", localSha: SHA, remoteRef: "refs/heads/dev" },
    ]);
  });
});

const ORIGIN = "https://github.com/owner/repo.git";
const toDev = () => lines(["a", "refs/heads/dev"]);

describe("planPush: where the push goes", () => {
  it("treats the remote origin by name (its own URL) as the production repository", () => {
    expect(planPush(ORIGIN, ORIGIN, toDev()).kind).toBe("deploy");
  });

  it("treats origin's repository by raw https URL as the production repository", () => {
    expect(
      planPush("https://github.com/owner/repo", ORIGIN, toDev()).kind,
    ).toBe("deploy");
    expect(
      planPush("HTTPS://GitHub.com/Owner/Repo.git/", ORIGIN, toDev()).kind,
    ).toBe("deploy");
    expect(
      planPush("https://user:token@github.com/owner/repo.git", ORIGIN, toDev())
        .kind,
    ).toBe("deploy");
  });

  it("treats origin's repository by an ssh spelling as the production repository when origin is https", () => {
    for (const ssh of [
      "git@github.com:owner/repo.git",
      "git@github.com:owner/repo",
      "ssh://git@github.com/owner/repo",
      "ssh://git@github.com:22/owner/repo.git",
    ]) {
      expect(planPush(ssh, ORIGIN, toDev()).kind).toBe("deploy");
    }
  });

  it("skips the checks for a different repository on the same host", () => {
    const plan = planPush("https://github.com/owner/fork.git", ORIGIN, toDev());
    expect(plan.kind).toBe("foreign");
    expect(plan.kind === "foreign" && plan.message).toContain(
      "github.com/owner/fork",
    );
    expect(
      planPush("git@github.com:someone/repo.git", ORIGIN, toDev()).kind,
    ).toBe("foreign");
  });

  it("skips the checks for a different host", () => {
    expect(
      planPush("https://gitlab.com/owner/repo.git", ORIGIN, toDev()).kind,
    ).toBe("foreign");
  });

  it("never prints credentials of the pushed URL", () => {
    const plan = planPush(
      "https://user:secret@example.com/x/y.git",
      ORIGIN,
      toDev(),
    );
    expect(plan.kind === "foreign" && plan.message).not.toContain("secret");
  });

  it("is never foreign when the repository has no origin", () => {
    expect(
      planPush("https://example.com/any.git", undefined, toDev()).kind,
    ).toBe("deploy");
  });

  it("is not foreign when the hook was given no URL", () => {
    expect(planPush(undefined, ORIGIN, toDev()).kind).toBe("deploy");
  });

  it("compares local paths and file URLs", () => {
    expect(planPush("/srv/o.git/", "/srv/o.git", toDev()).kind).toBe("deploy");
    expect(planPush("file:///srv/o.git", "/srv/o.git", toDev()).kind).toBe(
      "deploy",
    );
    expect(planPush("/srv/demo.git", "/srv/o.git", toDev()).kind).toBe(
      "foreign",
    );
  });
});

describe("planPush: what the push carries", () => {
  it("deploys for a push of a commit to dev or main", () => {
    expect(planPush(ORIGIN, ORIGIN, toDev())).toEqual({
      kind: "deploy",
      shas: [SHA],
    });
    expect(planPush(ORIGIN, ORIGIN, lines(["a", "refs/heads/main"])).kind).toBe(
      "deploy",
    );
  });

  it("collects every deploying sha of a multi-ref push", () => {
    const other = "b".repeat(40);
    expect(
      planPush(
        ORIGIN,
        ORIGIN,
        lines(
          ["a", "refs/heads/dev"],
          ["b", "refs/heads/feature"],
          ["c", "refs/heads/main", other],
        ),
      ),
    ).toEqual({ kind: "deploy", shas: [SHA, other] });
  });

  it("does not deploy for other branches, tags or a deletion", () => {
    expect(
      planPush(ORIGIN, ORIGIN, lines(["a", "refs/heads/feature"])).kind,
    ).toBe("local");
    expect(planPush(ORIGIN, ORIGIN, lines(["a", "refs/tags/v1"])).kind).toBe(
      "local",
    );
    expect(
      planPush(ORIGIN, ORIGIN, lines(["(delete)", "refs/heads/dev", ZERO]))
        .kind,
    ).toBe("local");
  });
});

describe("checkoutProblem", () => {
  const base = {
    shas: [SHA],
    headSha: "h".repeat(40),
    headTree: "tree-head",
    treeOf: (): string | undefined => "tree-head",
    dirty: false,
  };

  it("accepts a different commit with the same tree on a clean tree", () => {
    expect(checkoutProblem(base)).toBeUndefined();
  });

  it("names the pushed commit and HEAD when their trees differ", () => {
    const problem = checkoutProblem({ ...base, treeOf: () => "tree-other" });
    expect(problem).toContain(SHA);
    expect(problem).toContain(base.headSha);
    expect(problem).toContain("worktree that has");
  });

  it("stops when any one of several pushed commits differs", () => {
    const other = "b".repeat(40);
    const problem = checkoutProblem({
      ...base,
      shas: [SHA, other],
      treeOf: (sha) => (sha === other ? "tree-other" : "tree-head"),
    });
    expect(problem).toContain(other);
  });

  it("stops when the pushed commit is not in this repository", () => {
    expect(checkoutProblem({ ...base, treeOf: () => undefined })).toContain(
      "not in this repository",
    );
  });

  it("reports a dirty working tree", () => {
    expect(checkoutProblem({ ...base, dirty: true })).toContain(
      "uncommitted changes",
    );
  });
});
