import { describe, expect, it } from "vitest";
import {
  decide,
  GATES,
  heavyTimeout,
  parseArgs,
  parseRecords,
  RECORDS_KEPT,
  satisfiers,
  treeToRecord,
  skipMessage,
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
    expect(heavyTimeout("test", undefined)).toBe("3000");
    expect(heavyTimeout("test", "4000")).toBe("4000");
    expect(heavyTimeout("check", undefined)).toBeUndefined();
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
