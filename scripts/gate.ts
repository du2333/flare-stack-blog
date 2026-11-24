/**
 * Runs one of a fixed set of checks and remembers the code tree it passed on,
 * so the same tree is not verified again by the release hooks or the
 * pre-push hook after acceptance has verified it:
 *
 *   bun run gate <check|typecheck|test:node|test|test:changed|build|theme>
 *
 * A gate passed on a clean working tree records the tree's hash
 * (`HEAD^{tree}`) under the git common directory, which every worktree of the
 * repository shares. Run again on a recorded tree, the gate prints one line
 * and exits 0 without taking the heavy lock. A tree that is not clean runs the
 * command and records nothing: uncommitted changes, untracked files, or files
 * git is told to look past (assume-unchanged, skip-worktree), whatever the
 * user's git config. So does a tree that changed while the command ran.
 * GATE_FORCE=1 runs a recorded gate anyway.
 *
 * A run that is going to record first makes node_modules match bun.lock, and
 * every gate compiles the messages, so a record is about the tree with its own
 * dependencies and generated files. Ignored files such as `.dev.vars` are not
 * part of what is recorded.
 *
 * The commands are fixed and take no arguments, so a targeted run can never
 * count as the full one. `test:changed` is the one gate that runs part of a
 * suite, and it chooses the part itself: see `narrows`. A gate that runs goes
 * through scripts/heavy.sh (the machine-wide lock, which also sets the test
 * worker count), or runs directly on a system without `flock`.
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
  | "test:changed"
  | "build"
  | "theme";

export type GateSpec = {
  command: string;
  /** Other gates whose record also satisfies this one. */
  satisfiedBy?: Array<GateName>;
  /** HEAVY_TIMEOUT in seconds when the environment sets none. */
  timeout?: number;
  /**
   * This gate is the named one cut down to what a change can reach. Its
   * command gets a commit appended: the nearest ancestor either gate passed
   * on. The named gate runs in its place when there is no such commit, or
   * when the change since it touches FULL_RUN_PATHS.
   */
  narrows?: GateName;
};

export type GateTable = Record<GateName, GateSpec>;

// check, typecheck and the builds compile the messages through
// `orpc:contract`; the test gates do it themselves, so no gate tests a stale
// src/paraglide.
export const GATES: GateTable = {
  check: { command: "bun run check" },
  // `bun run check` runs tsc too.
  typecheck: { command: "bun typecheck", satisfiedBy: ["check"] },
  "test:node": { command: "bun run i18n:compile && bun run test:node" },
  // The full workerd suite takes about 900 s at two workers; heavy.sh's
  // default limit (1500 s) leaves too little room on a busy machine.
  test: { command: "bun run i18n:compile && bun run test", timeout: 3000 },
  // The workerd test files that import, directly or not, a file changed
  // since the commit appended: about a minute for a change no server test
  // reaches, where the full suite always takes its 900 s. The release still
  // runs `test`.
  "test:changed": {
    command: "bun run i18n:compile && bun run test --passWithNoTests --changed",
    satisfiedBy: ["test"],
    narrows: "test",
    timeout: 3000,
  },
  build: { command: "bun run build && bun scripts/bundle-report.ts --check" },
  theme: { command: "bun scripts/check-theme-styles.ts" },
};

/**
 * A change to one of these runs the full suite. They reach the tests without
 * being imported by one, and imports from a test file are all that
 * `vitest --changed` follows. A name ending in `/` is a directory.
 */
export const FULL_RUN_PATHS = [
  // Dependencies: imports are not followed into node_modules.
  "package.json",
  "bun.lock",
  // The test configuration and what it loads (a test holds this list to
  // the imports of vitest.config.ts).
  "vitest.config.ts",
  "vite.config.ts",
  "cloudflare.config.ts",
  "tsconfig.json",
  ".env.test",
  "scripts/vite-routed-segments.ts",
  "scripts/vite-theme-fixture.ts",
  // The setup file, the mocks the config aliases, and the helpers.
  "tests/",
  // Read into a binding by the configuration.
  "migrations/",
  // Compiled into src/paraglide, which git ignores.
  "messages/",
  "project.inlang/",
  "scripts/compile-messages.ts",
  // Read as text by virtual:routed-first-segments.
  "src/routeTree.gen.ts",
];

/** How many commits back a narrowing gate looks for one that passed. */
export const HISTORY_SEARCHED = 500;

/**
 * Run before a run that records. HUSKY=0 because the root `prepare` script
 * (husky) would rewrite core.hooksPath in the git config all worktrees share.
 */
export const PREPARE = "HUSKY=0 bun install --frozen-lockfile";

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
export function satisfiers(
  gate: GateName,
  gates: GateTable = GATES,
): Array<GateName> {
  return [gate, ...(gates[gate].satisfiedBy ?? [])];
}

/**
 * What to do for `gate`. `tree` is undefined when there is no commit to name
 * the tree by; `clean` as `treeState` reads it.
 */
export function decide(input: {
  gate: GateName;
  gates?: GateTable;
  tree: string | undefined;
  clean: boolean;
  records: Records;
  force: boolean;
}): Decision {
  const { gate, gates = GATES, tree, clean, records, force } = input;
  if (tree === undefined || !clean) {
    return { kind: "run", record: false, reason: "dirty" };
  }
  if (force) return { kind: "run", record: true, reason: "forced" };
  const passedAs = satisfiers(gate, gates).find((name) =>
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

/**
 * Paths `git ls-files -v` flags as assume-unchanged (a lower-case tag) or
 * skip-worktree (`S`): changes to them do not show in `git status`.
 */
export function hiddenPaths(lsFilesV: string) {
  return lsFilesV
    .split("\n")
    .filter((line) => /^([a-z]|S) /.test(line))
    .map((line) => line.slice(2));
}

/** The first of `paths` that is one of `rules` or under one, if any. */
export function fullRunPath(
  paths: Array<string>,
  rules: ReadonlyArray<string> = FULL_RUN_PATHS,
) {
  return paths.find((file) =>
    rules.some((rule) =>
      rule.endsWith("/") ? file.startsWith(rule) : file === rule,
    ),
  );
}

/**
 * The newest commit whose tree is in `passed`. `log` is
 * `git log --format='%H %T'`: one commit and its tree per line, newest first.
 */
export function baseCommit(log: string, passed: ReadonlySet<string>) {
  for (const line of log.split("\n")) {
    const [commit, tree] = line.trim().split(" ");
    if (commit && tree && passed.has(tree)) return commit;
  }
  return undefined;
}

/** The HEAVY_TIMEOUT a run of a gate gets: the environment's, else the gate's own. */
export function heavyTimeout(spec: GateSpec, envValue: string | undefined) {
  if (envValue) return envValue;
  return spec.timeout === undefined ? undefined : String(spec.timeout);
}

export function skipMessage(gate: GateName, passedAs: GateName, tree: string) {
  const what = passedAs === gate ? "" : ` ${passedAs}`;
  return `gate ${gate}: tree ${short(tree)} already passed${what}, skipping`;
}

function short(tree: string) {
  return tree.slice(0, 10);
}

type Context = { cwd: string; env: NodeJS.ProcessEnv };

function git(ctx: Context, ...args: Array<string>) {
  const result = spawnSync("git", args, {
    cwd: ctx.cwd,
    env: ctx.env,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

/** Clean regardless of the user's git config: see the header. */
function treeState(ctx: Context) {
  const status = git(ctx, "status", "--porcelain", "--untracked-files=all");
  const flagged = git(ctx, "ls-files", "-v");
  return {
    tree: git(ctx, "rev-parse", "--verify", "--quiet", "HEAD^{tree}"),
    clean:
      status === "" &&
      flagged !== undefined &&
      hiddenPaths(flagged).length === 0,
  };
}

function recordsDir(ctx: Context) {
  const common = git(ctx, "rev-parse", "--git-common-dir");
  if (common === undefined) throw new Error("gate: not in a git repository");
  return path.join(path.resolve(ctx.cwd, common), "verified");
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

/** One path per line, with no empty entries. */
function lines(text: string | undefined) {
  return text?.split("\n").filter((line) => line !== "");
}

/**
 * Every path that differs from `base`: committed since, staged, changed or
 * untracked, which is what `vitest --changed <base>` looks at. A rename
 * counts under both names. Undefined when git cannot say.
 */
function changedSince(ctx: Context, base: string) {
  const parts = [
    lines(git(ctx, "diff", "--name-only", "--no-renames", `${base}...HEAD`)),
    lines(git(ctx, "diff", "--name-only", "--no-renames", "--cached")),
    lines(
      git(
        ctx,
        "ls-files",
        "--full-name",
        "--others",
        "--modified",
        "--exclude-standard",
      ),
    ),
  ];
  return parts.every((part) => part !== undefined)
    ? parts.flatMap((part) => part ?? [])
    : undefined;
}

/**
 * For a gate that narrows another: the commit to append to its command, or
 * why the other gate has to run in its place.
 */
function narrowing(
  ctx: Context,
  dir: string,
  gate: GateName,
  narrows: GateName,
): { base: string } | { instead: string } {
  const passed = new Set([
    ...readRecords(dir, gate),
    ...readRecords(dir, narrows),
  ]);
  const log = git(
    ctx,
    "log",
    "--format=%H %T",
    "-n",
    String(HISTORY_SEARCHED),
    "HEAD",
  );
  const base = log === undefined ? undefined : baseCommit(log, passed);
  if (base === undefined) {
    return {
      instead: `none of the last ${HISTORY_SEARCHED} commits has a tree that passed ${narrows} or ${gate}`,
    };
  }
  const changed = changedSince(ctx, base);
  if (changed === undefined) {
    return { instead: `git could not list the changes since ${short(base)}` };
  }
  const forcing = fullRunPath(changed);
  return forcing === undefined
    ? { base }
    : {
        instead: `${forcing} changed since ${short(base)} and reaches the tests without being imported`,
      };
}

export type RunOptions = {
  gate: GateName;
  gates: GateTable;
  cwd: string;
  env: NodeJS.ProcessEnv;
  /** heavy.sh to run commands under, or undefined to run them directly. */
  heavy: string | undefined;
  /** Run before a run that records; undefined runs nothing. */
  prepare: string | undefined;
  log: (line: string) => void;
};

/** Runs `gate` in `cwd` and returns its exit code. */
export function runGate(options: RunOptions): number {
  const { gate, gates, log } = options;
  const ctx = { cwd: options.cwd, env: options.env };
  const dir = recordsDir(ctx);
  const before = treeState(ctx);
  const records: Records = {};
  for (const name of satisfiers(gate, gates)) {
    records[name] = readRecords(dir, name);
  }

  const decision = decide({
    gate,
    gates,
    tree: before.tree,
    clean: before.clean,
    records,
    force: options.env.GATE_FORCE === "1",
  });

  if (decision.kind === "skip") {
    log(skipMessage(gate, decision.passedAs, decision.tree));
    return 0;
  }

  const spec = gates[gate];
  let command = spec.command;
  if (spec.narrows !== undefined) {
    const narrowed = narrowing(ctx, dir, gate, spec.narrows);
    if ("instead" in narrowed) {
      log(`gate ${gate}: ${narrowed.instead}; running ${spec.narrows}`);
      return runGate({ ...options, gate: spec.narrows });
    }
    command = `${spec.command} ${narrowed.base}`;
  }
  const timeout = heavyTimeout(spec, options.env.HEAVY_TIMEOUT);
  const env = timeout
    ? { ...options.env, HEAVY_TIMEOUT: timeout }
    : options.env;
  const exec = (line: string) => {
    const [file, args] = options.heavy
      ? [options.heavy, ["sh", "-c", line]]
      : ["sh", ["-c", line]];
    const result = spawnSync(file, args, {
      cwd: options.cwd,
      env,
      stdio: "inherit",
    });
    if (result.error) {
      log(`gate ${gate}: could not run ${file}: ${result.error.message}`);
    }
    return result.status ?? 1;
  };

  if (decision.record && options.prepare !== undefined) {
    if (exec(options.prepare) !== 0) {
      log(
        `gate ${gate}: \`${options.prepare}\` failed: bun.lock and node_modules disagree, so the gate would not test this tree's dependencies`,
      );
      return 1;
    }
  }

  log(
    decision.reason === "dirty"
      ? `gate ${gate}: the working tree is not clean (changes, untracked files, or files marked assume-unchanged or skip-worktree), running \`${command}\` without recording`
      : `gate ${gate}: running \`${command}\` on tree ${short(before.tree ?? "")}`,
  );
  const exitCode = exec(command);
  const after = treeState(ctx);
  const recorded = treeToRecord({
    decision,
    treeBefore: before.tree,
    exitCode,
    cleanAfter: after.clean,
    treeAfter: after.tree,
  });
  if (recorded) {
    writeRecord(dir, gate, recorded);
    log(`gate ${gate}: passed, recorded tree ${short(recorded)}`);
  } else if (exitCode === 0 && decision.record) {
    log(
      `gate ${gate}: passed, not recorded: the working tree changed while it ran`,
    );
  }
  return exitCode;
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if ("error" in parsed) {
    console.error(parsed.error);
    process.exit(2);
  }
  const hasFlock = spawnSync("sh", ["-c", "command -v flock"]).status === 0;
  process.exit(
    runGate({
      gate: parsed.gate,
      gates: GATES,
      cwd: process.cwd(),
      env: process.env,
      heavy: hasFlock
        ? fileURLToPath(new URL("./heavy.sh", import.meta.url))
        : undefined,
      prepare: PREPARE,
      log: (line) => console.error(line),
    }),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
