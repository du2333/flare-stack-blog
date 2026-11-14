/**
 * The deploy preflight, the first step of `bun run deploy` (spec #318,
 * section 3):
 *
 *   bun scripts/deploy-preflight.ts && cf d1 migrations apply … && cf deploy … --tag "v$npm_package_version"
 *
 * Before the database is migrated and the Worker is deployed, it reads which
 * version is live (the serving Worker Version's `workers/tag`, else D1's
 * migration records) and stops the build when this version crosses a major
 * without `UPGRADE_ACK`, or when configuration a passed version requires is
 * missing. A stopped build deploys nothing; the site keeps running.
 *
 * `cf` is run as `node_modules/.bin/cf` with an argument list: in the build
 * image `bunx` splits an argument that holds spaces, so the SQL would not
 * arrive. The deploy tag is the shell's `$npm_package_version`, which
 * `bun run` sets from package.json; this script checks it matches the version
 * it decided on, so the tag cannot come out empty or different.
 *
 * `--dry-run` takes the live state and the names as flags and touches
 * nothing. The rules live in deploy-preflight-core.ts.
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
  ownUpgradesFile,
  parseUpgradesFile,
  type UpgradesFile,
} from "../src/lib/version/upgrades.ts";
import {
  ACK_VARIABLE,
  decidePreflight,
  formatReadFailure,
  readLiveState,
  readSecretNames,
  type Cf,
  type LiveState,
} from "./deploy-preflight-core.ts";

const USAGE = `usage: bun scripts/deploy-preflight.ts
       bun scripts/deploy-preflight.ts --dry-run --live <version|pre-gate|fresh> [--version <version>] [--env NAME,NAME] [--secrets NAME,NAME] [--ack <value>] [--upgrades <file>]`;

const HELP = `${USAGE}

Without flags (as \`bun run deploy\` runs it): reads the live Worker Version's
tag through cf, or D1's migration records when there is no version tag, and
stops the build when this version (package.json) crosses a major without
${ACK_VARIABLE}=<major>, or when a Build variable or Secret that a passed
version requires is missing. Needs WORKER_NAME and D1_DATABASE_ID.

  --dry-run    decide from the flags below; nothing is read from Cloudflare
  --live       the live version, \`pre-gate\` (installed before the gate) or \`fresh\`
  --version    this build's version (default: package.json)
  --env        names of the environment variables present (default: none)
  --secrets    names of the Worker's Secrets (default: none)
  --ack        the value of ${ACK_VARIABLE} (default: unset)
  --upgrades   an upgrades.json to read instead of the build's own
  --help`;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CF = path.join(ROOT, "node_modules", ".bin", "cf");

/** A failure of this script's own setup: a sentence, no stack trace. */
function stop(message: string, code = 1): never {
  console.error(`部署前检查未通过，构建已停止：${message}`);
  process.exit(code);
}

function packageVersion() {
  let version: unknown;
  try {
    version = JSON.parse(
      readFileSync(path.join(ROOT, "package.json"), "utf8"),
    ).version;
  } catch (error) {
    stop(
      `无法读取 package.json：${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return checkedVersion(version, "package.json 中的 version");
}

function checkedVersion(value: unknown, what: string, code = 1) {
  const parsed = typeof value === "string" ? parseAppVersion(value) : null;
  if (!parsed) stop(`${what}（${String(value)}）不是合法的版本号。`, code);
  return formatAppVersion(parsed);
}

function names(list: string | undefined) {
  return (list ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
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
        version: { type: "string" },
        env: { type: "string" },
        secrets: { type: "string" },
        ack: { type: "string" },
        upgrades: { type: "string" },
        help: { type: "boolean", default: false },
      },
    });
  } catch (error) {
    return stop(
      `${error instanceof Error ? error.message : String(error)}\n${USAGE}`,
      2,
    );
  }
}

function report(decision: { ok: boolean; text: string }): never {
  if (decision.ok) {
    console.log(decision.text);
    process.exit(0);
  }
  console.error(decision.text);
  process.exit(1);
}

function readUpgrades(file: string): UpgradesFile {
  let parsed: UpgradesFile | null = null;
  try {
    parsed = parseUpgradesFile(JSON.parse(readFileSync(file, "utf8")));
  } catch (error) {
    stop(
      `无法读取 ${file}：${error instanceof Error ? error.message : String(error)}`,
      2,
    );
  }
  if (!parsed) stop(`${file} 的结构不是合法的 upgrades.json。`, 2);
  return parsed;
}

function dryRun(values: ReturnType<typeof options>["values"]): never {
  const version = values.version
    ? checkedVersion(values.version, "--version", 2)
    : packageVersion();
  let live: LiveState;
  if (values.live === "pre-gate" || values.live === "fresh") {
    live = { kind: values.live };
  } else if (values.live) {
    live = {
      kind: "version",
      version: checkedVersion(values.live, "--live", 2),
    };
  } else {
    stop(`--dry-run 需要 --live。\n${USAGE}`, 2);
  }
  console.log("（--dry-run：判定只依据参数，没有访问 Cloudflare。）");
  report(
    decidePreflight({
      live,
      version,
      file: values.upgrades ? readUpgrades(values.upgrades) : ownUpgradesFile(),
      envNames: names(values.env),
      secretNames: live.kind === "fresh" ? "unknown" : names(values.secrets),
      ack: values.ack,
    }),
  );
}

function main() {
  const { values } = options();
  if (values.help) {
    console.log(HELP);
    return;
  }
  if (values["dry-run"]) dryRun(values);
  if (
    values.live ||
    values.version ||
    values.env ||
    values.secrets ||
    values.ack ||
    values.upgrades
  ) {
    stop(
      `--live、--version、--env、--secrets、--ack 和 --upgrades 只能与 --dry-run 一起使用。\n${USAGE}`,
      2,
    );
  }

  const version = packageVersion();
  // The deploy step tags with the shell's $npm_package_version; it has to be
  // the version decided on here, or the next preflight reads the wrong one.
  if (process.env.npm_package_version !== version) {
    stop(
      `部署标签取自环境变量 npm_package_version（${process.env.npm_package_version ?? "未设置"}），它与 package.json 中的版本 ${version} 不一致。请通过 \`bun run deploy\` 运行部署。`,
    );
  }
  const worker = process.env.WORKER_NAME?.trim();
  const databaseId = process.env.D1_DATABASE_ID?.trim();
  const unset = [
    ...(worker ? [] : ["WORKER_NAME"]),
    ...(databaseId ? [] : ["D1_DATABASE_ID"]),
  ];
  if (!worker || !databaseId) {
    stop(
      `缺少构建变量 ${unset.join("、")}。请在 Worker 的 Settings → Builds → Build variables 中添加后重试这次构建（Retry build）。`,
    );
  }

  const live = readLiveState(cf, worker, databaseId);
  if (!live.ok) {
    console.error(formatReadFailure(live.failure));
    process.exit(1);
  }

  let secretNames: Array<string> | "unknown" = "unknown";
  if (live.state.kind !== "fresh") {
    const secrets = readSecretNames(cf, worker);
    if (!secrets.ok) {
      console.error(formatReadFailure(secrets.failure));
      process.exit(1);
    }
    secretNames = secrets.names;
  }

  report(
    decidePreflight({
      live: live.state,
      version,
      file: ownUpgradesFile(),
      // A variable set to an empty value counts as missing.
      envNames: Object.entries(process.env)
        .filter(([, value]) => value !== undefined && value.trim() !== "")
        .map(([name]) => name),
      secretNames,
      ack: process.env[ACK_VARIABLE],
    }),
  );
}

try {
  main();
} catch (error) {
  // A bug here must still read as a sentence in the build log.
  stop(
    `检查程序出错：${error instanceof Error ? error.message : String(error)}。请把这段日志反馈到 https://github.com/du2333/flare-stack-blog/issues 。`,
  );
}
