import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decide,
  type GateName,
  GATES,
  type GateTable,
  heavyTimeout,
  hiddenPaths,
  parseArgs,
  parseRecords,
  RECORDS_KEPT,
  runGate,
  satisfiers,
  skipMessage,
  treeToRecord,
  withRecord,
} from "./gate.ts";

const TREE = "a".repeat(40);
const OTHER = "b".repeat(40);

describe("decide", () => {
  it("skips a clean tree the gate has passed on", () => {
    expect(
      decide({
        gate: "check",
        tree: TREE,
        clean: true,
        records: { check: [OTHER, TREE] },
        force: false,
      }),
    ).toEqual({ kind: "skip", passedAs: "check", tree: TREE });
  });

  it("runs and records when the tree has changed since the last pass", () => {
    expect(
      decide({
        gate: "check",
        tree: TREE,
        clean: true,
        records: { check: [OTHER] },
        force: false,
      }),
    ).toEqual({ kind: "run", record: true, reason: "unrecorded" });
  });

  it("runs without recording on a dirty tree, even a recorded one", () => {
    expect(
      decide({
        gate: "check",
        tree: TREE,
        clean: false,
        records: { check: [TREE] },
        force: false,
      }),
    ).toEqual({ kind: "run", record: false, reason: "dirty" });
  });

  it("runs without recording when there is no commit to name the tree", () => {
    expect(
      decide({
        gate: "check",
        tree: undefined,
        clean: true,
        records: {},
        force: false,
      }),
    ).toEqual({ kind: "run", record: false, reason: "dirty" });
  });

  it("runs a recorded gate again and re-records it when forced", () => {
    expect(
      decide({
        gate: "check",
        tree: TREE,
        clean: true,
        records: { check: [TREE] },
        force: true,
      }),
    ).toEqual({ kind: "run", record: true, reason: "forced" });
  });

  it("does not record a forced run on a dirty tree", () => {
    expect(
      decide({
        gate: "check",
        tree: TREE,
        clean: false,
        records: {},
        force: true,
      }),
    ).toMatchObject({ kind: "run", record: false });
  });

  it("counts a record of check for typecheck, but not the other way round", () => {
    expect(
      decide({
        gate: "typecheck",
        tree: TREE,
        clean: true,
        records: { check: [TREE] },
        force: false,
      }),
    ).toEqual({ kind: "skip", passedAs: "check", tree: TREE });
    expect(
      decide({
        gate: "check",
        tree: TREE,
        clean: true,
        records: { typecheck: [TREE] },
        force: false,
      }).kind,
    ).toBe("run");
  });

  it("does not count one test suite for the other", () => {
    expect(
      decide({
        gate: "test",
        tree: TREE,
        clean: true,
        records: { "test:node": [TREE] },
        force: false,
      }).kind,
    ).toBe("run");
  });
});

describe("satisfiers", () => {
  it("lists only typecheck as satisfied by another gate", () => {
    for (const gate of Object.keys(GATES) as Array<keyof typeof GATES>) {
      expect(satisfiers(gate)).toEqual(
        gate === "typecheck" ? ["typecheck", "check"] : [gate],
      );
    }
  });
});

describe("treeToRecord", () => {
  const run = { kind: "run", record: true, reason: "unrecorded" } as const;
  const passed = {
    decision: run,
    treeBefore: TREE,
    exitCode: 0,
    cleanAfter: true,
    treeAfter: TREE,
  };

  it("records a passing run on a tree that stayed clean and the same", () => {
    expect(treeToRecord(passed)).toBe(TREE);
  });

  it("records nothing when the command fails", () => {
    expect(treeToRecord({ ...passed, exitCode: 1 })).toBeUndefined();
  });

  it("records nothing when the tree became dirty or changed while it ran", () => {
    expect(treeToRecord({ ...passed, cleanAfter: false })).toBeUndefined();
    expect(treeToRecord({ ...passed, treeAfter: OTHER })).toBeUndefined();
  });

  it("records nothing for a run that was not to be recorded", () => {
    expect(
      treeToRecord({
        ...passed,
        decision: { kind: "run", record: false, reason: "dirty" },
      }),
    ).toBeUndefined();
  });
});

describe("withRecord", () => {
  it("appends the tree once and keeps the last 20", () => {
    const many = Array.from({ length: RECORDS_KEPT }, (_, i) =>
      i.toString(16).padStart(40, "0"),
    );
    const next = withRecord(many, TREE);
    expect(next).toHaveLength(RECORDS_KEPT);
    expect(next.at(-1)).toBe(TREE);
    expect(next[0]).toBe(many[1]);
  });

  it("moves a tree recorded before to the newest place", () => {
    expect(withRecord([TREE, OTHER], TREE)).toEqual([OTHER, TREE]);
  });
});

describe("parseRecords", () => {
  it("reads one hash per line and ignores anything else", () => {
    expect(parseRecords(`${TREE}\n\nnot a hash\n ${OTHER} \n`)).toEqual([
      TREE,
      OTHER,
    ]);
  });
});

describe("parseArgs", () => {
  it("takes exactly one known gate", () => {
    expect(parseArgs(["test:node"])).toEqual({ gate: "test:node" });
    expect(parseArgs([])).toHaveProperty("error");
    expect(parseArgs(["lint"])).toHaveProperty("error");
  });

  it("refuses extra arguments, so a targeted run never counts as the suite", () => {
    expect(parseArgs(["test", "src/a.test.ts"])).toHaveProperty("error");
  });

  it("refuses names inherited from Object", () => {
    expect(parseArgs(["toString"])).toHaveProperty("error");
  });
});

describe("heavyTimeout", () => {
  it("gives the full suite more time unless the environment sets one", () => {
    expect(heavyTimeout(GATES.test, undefined)).toBe("3000");
    expect(heavyTimeout(GATES.test, "4000")).toBe("4000");
    expect(heavyTimeout(GATES.check, undefined)).toBeUndefined();
  });
});

describe("hiddenPaths", () => {
  it("names files marked assume-unchanged or skip-worktree", () => {
    expect(
      hiddenPaths("H a.ts\nh b.ts\nS c.ts\ns d.ts\nM e.ts\nH S.ts\n"),
    ).toEqual(["b.ts", "c.ts", "d.ts"]);
  });
});

describe("GATES", () => {
  it("compiles the messages before either test suite", () => {
    expect(GATES["test:node"].command).toMatch(/^bun run i18n:compile && /);
    expect(GATES.test.command).toMatch(/^bun run i18n:compile && /);
  });
});

describe("runGate in a real repository", () => {
  let repo: string;
  let mark: string;
  const env = () => {
    const clean = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
    );
    return {
      ...clean,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
      MARK: mark,
    };
  };
  const sh = (command: string) => {
    const result = spawnSync("sh", ["-c", command], {
      cwd: repo,
      env: env(),
      encoding: "utf8",
    });
    if (result.status !== 0) throw new Error(`${command}: ${result.stderr}`);
    return result.stdout.trim();
  };
  const commit = (message: string) =>
    sh(
      `git add -A && git -c user.name=t -c user.email=t@t commit -qm '${message}'`,
    );
  // Each command leaves a line in $MARK (outside the repository) when it runs.
  const fakes: GateTable = {
    check: { command: 'echo check >> "$MARK"' },
    typecheck: { command: 'echo typecheck >> "$MARK"', satisfiedBy: ["check"] },
    "test:node": { command: 'echo test:node >> "$MARK"; false' },
    test: { command: 'echo test >> "$MARK" && false' },
    build: { command: 'echo build >> "$MARK" && echo more >> tracked.txt' },
    theme: { command: 'echo theme >> "$MARK"' },
  };
  const run = (
    gate: GateName,
    extra: { env?: Record<string, string>; prepare?: string } = {},
  ) => {
    const lines: Array<string> = [];
    const code = runGate({
      gate,
      gates: fakes,
      cwd: repo,
      env: { ...env(), ...extra.env },
      heavy: undefined,
      prepare: extra.prepare,
      log: (line) => lines.push(line),
    });
    return { code, out: lines.join("\n") };
  };
  const ran = () =>
    existsSync(mark) ? readFileSync(mark, "utf8").trim().split("\n") : [];
  const recorded = (gate: GateName) => {
    const file = path.join(repo, ".git", "verified", gate);
    return existsSync(file) ? parseRecords(readFileSync(file, "utf8")) : [];
  };

  beforeEach(() => {
    const root = mkdtempSync(path.join(tmpdir(), "gate-test-"));
    repo = path.join(root, "repo");
    mark = path.join(root, "mark");
    mkdirSync(repo);
    sh("git init -q");
    writeFileSync(path.join(repo, "tracked.txt"), "one\n");
    commit("one");
  });

  afterEach(() => {
    rmSync(path.dirname(repo), { recursive: true, force: true });
  });

  it("records the first run and skips the second", () => {
    expect(run("check").code).toBe(0);
    expect(recorded("check")).toEqual([sh("git rev-parse HEAD^{tree}")]);
    const second = run("check");
    expect(second.code).toBe(0);
    expect(second.out).toContain("already passed, skipping");
    expect(ran()).toEqual(["check"]);
  });

  it("runs again after a commit that changes a file", () => {
    run("check");
    writeFileSync(path.join(repo, "tracked.txt"), "two\n");
    commit("two");
    expect(run("check").out).toContain("recorded tree");
    expect(ran()).toEqual(["check", "check"]);
    expect(recorded("check")).toHaveLength(2);
  });

  it("runs without recording when there is an untracked file", () => {
    sh("git config status.showUntrackedFiles no");
    writeFileSync(path.join(repo, "new.txt"), "x\n");
    expect(run("check").out).toContain("without recording");
    expect(recorded("check")).toEqual([]);
  });

  it("runs without recording when a file is marked skip-worktree or assume-unchanged", () => {
    for (const flag of ["--skip-worktree", "--assume-unchanged"]) {
      sh(`git update-index ${flag} tracked.txt`);
      writeFileSync(path.join(repo, "tracked.txt"), "hidden\n");
      expect(run("check").out).toContain("without recording");
      expect(recorded("check")).toEqual([]);
      sh(`git update-index --no${flag.slice(1)} tracked.txt`);
      sh("git checkout -- tracked.txt");
    }
  });

  it("exits non-zero and records nothing when the command fails", () => {
    expect(run("test:node").code).not.toBe(0);
    expect(run("test").code).not.toBe(0);
    expect(recorded("test:node")).toEqual([]);
    expect(recorded("test")).toEqual([]);
    expect(ran()).toEqual(["test:node", "test"]);
  });

  it("passes but records nothing when the command dirties the tree", () => {
    const result = run("build");
    expect(result.code).toBe(0);
    expect(result.out).toContain("not recorded");
    expect(recorded("build")).toEqual([]);
  });

  it("counts a record of check for typecheck", () => {
    run("check");
    expect(run("typecheck").out).toContain("already passed check");
    expect(ran()).toEqual(["check"]);
  });

  it("reruns a recorded gate under GATE_FORCE=1", () => {
    run("check");
    expect(run("check", { env: { GATE_FORCE: "1" } }).out).toContain(
      "recorded tree",
    );
    expect(ran()).toEqual(["check", "check"]);
  });

  it("fails without running the command when the install step fails", () => {
    const result = run("check", { prepare: "false" });
    expect(result.code).toBe(1);
    expect(result.out).toContain("bun.lock and node_modules disagree");
    expect(ran()).toEqual([]);
    expect(recorded("check")).toEqual([]);
  });

  it("skips the install step on a run that will not record", () => {
    writeFileSync(path.join(repo, "new.txt"), "x\n");
    expect(run("check", { prepare: "false" }).code).toBe(0);
  });

  it("says why when the runner cannot start", () => {
    const lines: Array<string> = [];
    const code = runGate({
      gate: "check",
      gates: fakes,
      cwd: repo,
      env: env(),
      heavy: path.join(repo, "missing-heavy.sh"),
      prepare: undefined,
      log: (line) => lines.push(line),
    });
    expect(code).toBe(1);
    expect(lines.join("\n")).toContain("could not run");
  });
});

describe("skipMessage", () => {
  it("names the gate, the short tree and the gate that passed", () => {
    expect(skipMessage("check", "check", TREE)).toBe(
      "gate check: tree aaaaaaaaaa already passed, skipping",
    );
    expect(skipMessage("typecheck", "check", TREE)).toContain(
      "already passed check",
    );
  });
});
