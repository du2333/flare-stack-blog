/**
 * The deploy preflight, the first step of `bun run deploy` (spec #318,
 * section 3):
 *
 *   bun scripts/deploy-preflight.ts && cf d1 migrations apply … && cf deploy … --tag "v$npm_package_version"
 *
 * Before the database is migrated and the Worker is deployed, it reads which
 * version is live (the newest deployment whose serving version is tagged with
 * a version, else D1's migration records) and stops the build when this
 * version crosses a major without `UPGRADE_ACK`, or, upwards, without the
 * configuration the versions crossed require. A stopped build deploys
 * nothing; the site keeps running.
 *
 * `cf` is run as `node_modules/.bin/cf` with an argument list: in the build
 * image `bunx` splits an argument that holds spaces, so the SQL would not
 * arrive. The deploy tag is the shell's `$npm_package_version`, which
 * `bun run` sets from package.json; the setup check stops the build when it
 * is not the version decided on.
 *
 * `--dry-run` takes the live state and the names as flags and touches
 * nothing. The rules live in deploy-preflight-core.ts; this file reads and
 * prints.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  formatAppVersion,
  parseAppVersion,
} from "../src/lib/version/app-version.ts";
import {
  checkUpgradesFile,
  ownUnreleasedEntry,
  ownUpgradesFile,
  type UnreleasedEntry,
  type UpgradesFile,
} from "../src/lib/version/upgrades.ts";
import {
  ACK_VARIABLE,
  checkSetup,
  decidePreflight,
  formatReadFailure,
  readLiveState,
  readSecretNames,
  type Cf,
  type LiveState,
} from "./deploy-preflight-core.ts";

const USAGE = `usage: bun run deploy   (runs: bun scripts/deploy-preflight.ts, then the migration and the deploy)
       bun scripts/deploy-preflight.ts --dry-run --live <version|pre-gate|no-worker|fresh> [--deployment <n>] [--version <version>] [--env NAME,NAME] [--secrets NAME,NAME] [--ack <value>] [--upgrades <file>]`;

const HELP = `${USAGE}

Without flags (as \`bun run deploy\` runs it): reads the version tag of the
newest of the listed deployments that has one, or D1's migration records when
none has, and stops the build when this version (package.json) crosses a major
without ${ACK_VARIABLE}=<major>, or, upwards, when a Build variable or Secret a
crossed version requires is missing. Needs WORKER_NAME and D1_DATABASE_ID.

  --dry-run     decide from the flags below; nothing is read from Cloudflare
  --live        the live version; \`pre-gate\` (deployed, no version tag, D1 has
                migrations); \`no-worker\` (no Worker or no deployment, D1 has
                migrations); \`fresh\`
  --deployment  for a version: which deployment, newest first, carried the tag;
                for pre-gate: how many untagged deployments were walked (default 1)
  --version     this build's version (default: package.json)
  --env         names of the Build variables present (default: none)
  --secrets     names of the Worker's Secrets (default: none)
  --ack         the value of ${ACK_VARIABLE} (default: unset)
  --upgrades    an upgrades.json to read instead of the build's own
  --help`;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CF = path.join(ROOT, "node_modules", ".bin", "cf");

/** Prints and exits; every exit path goes through here, so no stack trace reaches the log. */
function exit(text: string, code: number): never {
  if (code === 0) console.log(text);
  else console.error(text);
  process.exit(code);
}

function usage(message: string): never {
  exit(`deploy-preflight: ${message}\n${USAGE}`, 2);
}

function readPackageVersion(): unknown {
  try {
    return JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"))
      .version;
  } catch (error) {
    return exit(
      `部署前检查未通过，构建已停止：无法读取 package.json：${error instanceof Error ? error.message : String(error)}`,
      1,
    );
  }
}

const cf: Cf = (args) => {
  const result = spawnSync(CF, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    ...(result.error ? { error: result.error.message } : {}),
  };
};

function options() {
  try {
    return parseArgs({
      options: {
        "dry-run": { type: "boolean", default: false },
        live: { type: "string" },
        deployment: { type: "string" },
        version: { type: "string" },
        env: { type: "string" },
        secrets: { type: "string" },
        ack: { type: "string" },
        upgrades: { type: "string" },
        help: { type: "boolean", default: false },
      },
    });
  } catch (error) {
    return usage(error instanceof Error ? error.message : String(error));
  }
}

type Values = ReturnType<typeof options>["values"];

function names(list: string | undefined) {
  return (list ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function flagVersion(value: string, flag: string) {
  const parsed = parseAppVersion(value);
  if (!parsed) usage(`${flag} ${value} is not a version`);
  return formatAppVersion(parsed);
}

function dryRunLive(values: Values): LiveState {
  const deployment = Number(values.deployment ?? "1");
  if (!Number.isInteger(deployment) || deployment < 1) {
    usage("--deployment takes a whole number from 1");
  }
  switch (values.live) {
    case undefined:
      return usage("--dry-run needs --live");
    case "fresh":
      return { kind: "fresh" };
    case "no-worker":
      return { kind: "pre-gate", untagged: 0 };
    case "pre-gate":
      return { kind: "pre-gate", untagged: deployment };
    default:
      return {
        kind: "version",
        version: flagVersion(values.live, "--live"),
        deployment,
      };
  }
}

/** A fixture file for --upgrades, read strictly: its `unreleased` is kept. */
function readUpgrades(file: string): {
  file: UpgradesFile;
  unreleased: UnreleasedEntry | null;
} {
  let input: unknown;
  try {
    input = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    usage(
      `cannot read ${file}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const checked = checkUpgradesFile(input);
  if (!checked.ok) usage(`${file}: ${checked.problems.join("; ")}`);
  const { unreleased, versions } = checked.file;
  return { file: { versions }, unreleased: unreleased ?? null };
}

function dryRun(values: Values): never {
  const live = dryRunLive(values);
  const version = values.version
    ? flagVersion(values.version, "--version")
    : flagVersion(String(readPackageVersion()), "package.json version");
  const upgrades = values.upgrades
    ? readUpgrades(values.upgrades)
    : { file: ownUpgradesFile(), unreleased: ownUnreleasedEntry() };
  const env: Record<string, string> = Object.fromEntries(
    names(values.env).map((name) => [name, "set"]),
  );
  if (values.ack !== undefined) env[ACK_VARIABLE] = values.ack;

  console.log("（--dry-run：判定只依据参数，没有访问 Cloudflare。）");
  const decision = decidePreflight({
    live,
    version,
    ...upgrades,
    env,
    readSecrets: () => {
      console.log(
        "（此处会运行 cf workers secrets list；--dry-run 使用 --secrets 给出的名称。）",
      );
      return { ok: true, names: names(values.secrets) };
    },
  });
  exit(decision.text, decision.ok ? 0 : 1);
}

function main() {
  const { values } = options();
  if (values.help) exit(HELP, 0);
  if (values["dry-run"]) dryRun(values);
  const dryRunOnly = [
    values.live,
    values.deployment,
    values.version,
    values.env,
    values.secrets,
    values.ack,
    values.upgrades,
  ];
  if (dryRunOnly.some((value) => value !== undefined)) {
    usage(
      "--live, --deployment, --version, --env, --secrets, --ack and --upgrades need --dry-run",
    );
  }

  const setup = checkSetup(readPackageVersion(), process.env);
  if (!setup.ok) exit(setup.text, 1);
  const { version, worker, databaseId } = setup;

  const live = readLiveState(cf, worker, databaseId);
  if (!live.ok) exit(formatReadFailure(live.failure), 1);

  const decision = decidePreflight({
    live: live.state,
    version,
    file: ownUpgradesFile(),
    unreleased: ownUnreleasedEntry(),
    env: process.env,
    readSecrets: () => readSecretNames(cf, worker),
  });
  exit(decision.text, decision.ok ? 0 : 1);
}

try {
  main();
} catch (error) {
  // A bug here must still read as a sentence in the build log.
  exit(
    `部署前检查未通过，构建已停止：检查程序出错：${error instanceof Error ? error.message : String(error)}。请把这段日志反馈到 https://github.com/du2333/flare-stack-blog/issues 。`,
    1,
  );
}
