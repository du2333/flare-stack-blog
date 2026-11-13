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

describe("planPush", () => {
  it("skips every check for a remote other than origin, even for dev", () => {
    const plan = planPush("demo", lines(["refs/heads/dev", "refs/heads/dev"]));
    expect(plan.kind).toBe("foreign");
    expect(plan.kind === "foreign" && plan.message).toContain('"demo"');
  });

  it("treats a push by URL (the name is the URL) as foreign", () => {
    expect(
      planPush("https://example.com/fork.git", lines(["a", "refs/heads/dev"]))
        .kind,
    ).toBe("foreign");
  });

  it("deploys for a push of a commit to origin dev or main", () => {
    expect(planPush("origin", lines(["a", "refs/heads/dev"]))).toEqual({
      kind: "deploy",
      shas: [SHA],
    });
    expect(planPush("origin", lines(["a", "refs/heads/main"])).kind).toBe(
      "deploy",
    );
  });

  it("collects every deploying sha of a multi-ref push", () => {
    const other = "b".repeat(40);
    expect(
      planPush(
        "origin",
        lines(
          ["a", "refs/heads/dev"],
          ["b", "refs/heads/feature"],
          ["c", "refs/heads/main", other],
        ),
      ),
    ).toEqual({ kind: "deploy", shas: [SHA, other] });
  });

  it("does not deploy for other branches, tags or a deletion", () => {
    expect(planPush("origin", lines(["a", "refs/heads/feature"])).kind).toBe(
      "local",
    );
    expect(planPush("origin", lines(["a", "refs/tags/v1"])).kind).toBe("local");
    expect(
      planPush("origin", lines(["(delete)", "refs/heads/dev", ZERO])).kind,
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
