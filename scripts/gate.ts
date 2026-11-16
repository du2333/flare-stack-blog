/**
 * Runs one of a fixed set of checks and remembers the code tree it passed on,
 * so the same tree is not verified again by the release hooks or the
 * pre-push hook after acceptance has verified it:
 *
 *   bun run gate <check|typecheck|test:node|test|build|theme>
 *
 * A gate passed on a clean working tree records the tree's hash
 * (`HEAD^{tree}`) under the git common directory, which every worktree of the
 * repository shares. Run again on a recorded tree, the gate prints one line
 * and exits 0 without taking the heavy lock. A dirty tree (untracked files
 * included) runs the command and records nothing, and so does a tree that
 * changed while the command ran. GATE_FORCE=1 runs a recorded gate anyway.
 *
 * The commands are fixed and take no arguments, so a targeted run can never
 * count as the full one. A gate that runs goes through scripts/heavy.sh (the
 * machine-wide lock, which also sets the test worker count), or runs directly
 * on a system without `flock`.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type GateName =
  | "check"
  | "typecheck"
  | "test:node"
  | "test"
  | "build"
  | "theme";

type GateSpec = {
  command: string;
  /** Other gates whose record also satisfies this one. */
  satisfiedBy?: Array<GateName>;
  /** HEAVY_TIMEOUT in seconds when the environment sets none. */
  timeout?: number;
};

export const GATES: Record<GateName, GateSpec> = {
  check: { command: "bun run check" },
  // `bun run check` runs tsc too.
  typecheck: { command: "bun typecheck", satisfiedBy: ["check"] },
  "test:node": { command: "bun run test:node" },
  // The full workerd suite takes about 900 s at two workers; heavy.sh's
  // default limit (1500 s) leaves too little room on a busy machine.
  test: { command: "bun run test", timeout: 3000 },
  build: { command: "bun run build && bun scripts/bundle-report.ts --check" },
  theme: { command: "bun scripts/check-theme-styles.ts" },
};

/** Tree hashes kept per gate, oldest first. */
export const RECORDS_KEPT = 20;

export type Records = Partial<Record<GateName, Array<string>>>;

export type Decision =
  | { kind: "skip"; passedAs: GateName; tree: string }
  | { kind: "run"; record: boolean; reason: "unrecorded" | "forced" | "dirty" };

export function isGateName(name: string): name is GateName {
  return Object.hasOwn(GATES, name);
}

export function parseArgs(
  args: Array<string>,
): { gate: GateName } | { error: string } {
  const usage = `usage: bun run gate <${Object.keys(GATES).join("|")}>`;
  if (args.length !== 1) {
    return { error: `${usage}\n  takes exactly one gate and no arguments` };
  }
  return isGateName(args[0])
    ? { gate: args[0] }
    : { error: `${usage}\n  unknown gate: ${args[0]}` };
}

/** The gate itself first, then the gates whose record also satisfies it. */
export function satisfiers(gate: GateName): Array<GateName> {
  return [gate, ...(GATES[gate].satisfiedBy ?? [])];
}

/**
 * What to do for `gate`. `tree` is undefined when there is no commit to name
 * the tree by; `clean` means `git status --porcelain` printed nothing.
 */
export function decide(input: {
  gate: GateName;
  tree: string | undefined;
  clean: boolean;
  records: Records;
  force: boolean;
}): Decision {
  const { gate, tree, clean, records, force } = input;
  if (tree === undefined || !clean) {
    return { kind: "run", record: false, reason: "dirty" };
  }
  if (force) return { kind: "run", record: true, reason: "forced" };
  const passedAs = satisfiers(gate).find((name) =>
    records[name]?.includes(tree),
  );
  return passedAs
    ? { kind: "skip", passedAs, tree }
    : { kind: "run", record: true, reason: "unrecorded" };
}

/**
 * The tree a run records, or undefined: only a passing command records, on a
 * tree that was clean before and still is, and is still the same tree.
 */
export function treeToRecord(input: {
  decision: Decision;
  treeBefore: string | undefined;
  exitCode: number;
  cleanAfter: boolean;
  treeAfter: string | undefined;
}) {
  const { decision, treeBefore, exitCode, cleanAfter, treeAfter } = input;
  const records =
    decision.kind === "run" &&
    decision.record &&
    exitCode === 0 &&
    cleanAfter &&
    treeAfter === treeBefore;
  return records ? treeBefore : undefined;
}

/** `records` with `tree` as the newest entry, trimmed to the last `kept`. */
export function withRecord(
  records: Array<string>,
  tree: string,
  kept = RECORDS_KEPT,
) {
  return [...records.filter((entry) => entry !== tree), tree].slice(-kept);
}

/** One tree hash per line; anything else is ignored. */
export function parseRecords(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[0-9a-f]{40,64}$/.test(line));
}

/** The HEAVY_TIMEOUT a run of `gate` gets: the environment's, else the gate's own. */
export function heavyTimeout(gate: GateName, envValue: string | undefined) {
  if (envValue) return envValue;
  const { timeout } = GATES[gate];
  return timeout === undefined ? undefined : String(timeout);
}

export function skipMessage(gate: GateName, passedAs: GateName, tree: string) {
  const what = passedAs === gate ? "" : ` ${passedAs}`;
  return `gate ${gate}: tree ${short(tree)} already passed${what}, skipping`;
}

function short(tree: string) {
  return tree.slice(0, 10);
}

function git(...args: Array<string>) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function treeState() {
  return {
    tree: git("rev-parse", "--verify", "--quiet", "HEAD^{tree}"),
    clean: git("status", "--porcelain") === "",
  };
}

function recordsDir() {
  const common = git("rev-parse", "--git-common-dir");
  if (common === undefined) throw new Error("gate: not in a git repository");
  return path.join(path.resolve(common), "verified");
}

function readRecords(dir: string, gate: GateName) {
  try {
    return parseRecords(readFileSync(path.join(dir, gate), "utf8"));
  } catch {
    return [];
  }
}

function writeRecord(dir: string, gate: GateName, tree: string) {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, gate);
  // Read again right before writing: another worktree may have recorded a
  // tree while this one ran. The rename keeps a reader from seeing half a file.
  const lines = withRecord(readRecords(dir, gate), tree);
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, `${lines.join("\n")}\n`);
  renameSync(temp, file);
}

function hasFlock() {
  return spawnSync("sh", ["-c", "command -v flock"]).status === 0;
}

function runCommand(gate: GateName) {
  const { command } = GATES[gate];
  const timeout = heavyTimeout(gate, process.env.HEAVY_TIMEOUT);
  const env = timeout
    ? { ...process.env, HEAVY_TIMEOUT: timeout }
    : process.env;
  const heavy = fileURLToPath(new URL("./heavy.sh", import.meta.url));
  const [file, args] = hasFlock()
    ? [heavy, ["sh", "-c", command]]
    : ["sh", ["-c", command]];
  const result = spawnSync(file, args, { stdio: "inherit", env });
  return result.status ?? 1;
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if ("error" in parsed) {
    console.error(parsed.error);
    process.exit(2);
  }
  const { gate } = parsed;
  const dir = recordsDir();
  const before = treeState();
  const records: Records = {};
  for (const name of satisfiers(gate)) records[name] = readRecords(dir, name);

  const decision = decide({
    gate,
    tree: before.tree,
    clean: before.clean,
    records,
    force: process.env.GATE_FORCE === "1",
  });

  if (decision.kind === "skip") {
    console.error(skipMessage(gate, decision.passedAs, decision.tree));
    return;
  }

  const { command } = GATES[gate];
  console.error(
    decision.reason === "dirty"
      ? `gate ${gate}: the working tree has uncommitted changes, running \`${command}\` without recording`
      : `gate ${gate}: running \`${command}\` on tree ${short(before.tree ?? "")}`,
  );
  const exitCode = runCommand(gate);
  const after = treeState();
  const recorded = treeToRecord({
    decision,
    treeBefore: before.tree,
    exitCode,
    cleanAfter: after.clean,
    treeAfter: after.tree,
  });
  if (recorded) {
    writeRecord(dir, gate, recorded);
    console.error(`gate ${gate}: passed, recorded tree ${short(recorded)}`);
  } else if (exitCode === 0 && decision.record) {
    console.error(
      `gate ${gate}: passed, not recorded: the working tree changed while it ran`,
    );
  }
  process.exit(exitCode);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
