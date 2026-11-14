/**
 * The logic of scripts/deploy-preflight.ts (spec #318, section 3): reading
 * what is live from `cf` output, and deciding whether this build may migrate
 * the database and deploy. `cf` is injected, so the tests drive every read
 * with the output shapes recorded in a real Workers Builds run.
 *
 * This runs in every fork's Workers Builds; a bug here stops everyone's
 * upgrades. Each read either yields a state from the table below or fails by
 * name; nothing is guessed:
 *
 * | live Worker Version              | D1 `d1_migrations`   | state              |
 * |----------------------------------|----------------------|--------------------|
 * | tag `v<version>`                 | not read             | that version       |
 * | none, no Worker, no tag, bad tag | has rows             | pre-gate (3.0.0)   |
 * | none, no Worker, no tag, bad tag | missing or empty     | fresh install      |
 * | any read fails                   |                      | the preflight fails |
 *
 * The text is for a fork owner reading a build log, often without the guide:
 * Chinese sentences, names verbatim, what to do first and numbered.
 */
import {
  formatAppVersion,
  parseAppVersion,
} from "../src/lib/version/app-version.ts";
import {
  entriesBetween,
  type UpgradesFile,
} from "../src/lib/version/upgrades.ts";

/**
 * The version a site installed before the gate existed is taken to run: the
 * first of the major the gate ships in. Such a site has migrations in D1 but
 * no tagged Worker Version.
 */
export const PRE_GATE_VERSION = "3.0.0";

/** The build variable that acknowledges a move to another major. */
export const ACK_VARIABLE = "UPGRADE_ACK";

/** The deployment guide's section on crossing a major. */
export const UPGRADE_GUIDE_URL = `https://github.com/du2333/flare-stack-blog/blob/main/docs/deployment.md#${encodeURIComponent("跨大版本升级")}`;

const BUILD_VARIABLES_PLACE = "Worker 的 Settings → Builds → Build variables";
const SECRETS_PLACE = "Worker 的 Settings → Runtime variables and secrets";

export type LiveState =
  | { kind: "version"; version: string }
  | { kind: "pre-gate" }
  | { kind: "fresh" };

// --- Reading what is live -------------------------------------------------

/** What running `cf` returned; `error` when it could not be started at all. */
export type CfResult = {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: string;
};

export type Cf = (args: Array<string>) => CfResult;

/** A read that failed: which one, the command and what it printed. */
export type ReadFailure = {
  read: string;
  command: string;
  detail: string;
};

export type LiveRead =
  | {
      ok: true;
      state: LiveState;
      /** How the state was found, for the tests and the log. */
      via: "tag" | "no-worker" | "no-deployment" | "no-tag" | "tag-not-version";
      /** The tag that was read, when there was one. */
      tag?: string;
    }
  | { ok: false; failure: ReadFailure };

export const TABLE_EXISTS_SQL =
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'd1_migrations'";
export const MIGRATION_COUNT_SQL = "SELECT count(*) AS n FROM d1_migrations";

const READS = {
  deployments: "读取线上部署",
  version: "读取线上的 Worker 版本",
  table: "确认 D1 迁移记录表是否存在",
  count: "读取 D1 迁移记录数",
  secrets: "读取 Worker 的 Secret 名称",
} as const;

type Read = keyof typeof READS;

class ReadError extends Error {
  constructor(
    readonly read: Read,
    readonly args: Array<string>,
    readonly detail: string,
  ) {
    super(detail);
  }
}

/** `cf` exited 1 because the Worker does not exist on the account. */
function isNoWorker(result: CfResult) {
  return result.status !== 0 && /\[10007\]/.test(result.stderr);
}

function lastLines(text: string, count = 20) {
  const lines = text.trim().split(/\r?\n/);
  return lines.slice(-count).join("\n");
}

function failedRun(read: Read, args: Array<string>, result: CfResult) {
  if (result.error) {
    return new ReadError(read, args, `无法运行 cf：${result.error}`);
  }
  const output = lastLines(result.stderr) || lastLines(result.stdout);
  return new ReadError(
    read,
    args,
    `退出码 ${result.status}${output ? `，输出：\n${output}` : "，没有输出"}`,
  );
}

function run(cf: Cf, read: Read, args: Array<string>): CfResult {
  const result = cf(args);
  if (result.error) throw failedRun(read, args, result);
  return result;
}

function json(read: Read, args: Array<string>, stdout: string): unknown {
  try {
    return JSON.parse(stdout);
  } catch {
    throw new ReadError(
      read,
      args,
      `输出不是 JSON：\n${lastLines(stdout) || "（空）"}`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unexpected(read: Read, args: Array<string>, what: string): never {
  throw new ReadError(read, args, `输出的结构与预期不符：${what}`);
}

/**
 * The version serving traffic: the first deployment's version with the
 * largest percentage (the first of equals). Null when there is no deployment.
 */
export function servingVersionId(
  output: unknown,
  args: Array<string> = [],
): string | null {
  const read = "deployments";
  if (!isRecord(output) || !Array.isArray(output.deployments)) {
    unexpected(read, args, "没有 deployments 列表");
  }
  const [first] = output.deployments;
  if (first === undefined) return null;
  if (!isRecord(first) || !Array.isArray(first.versions)) {
    unexpected(read, args, "第一条部署没有 versions 列表");
  }
  let best: { id: string; percentage: number } | null = null;
  for (const version of first.versions) {
    if (
      !isRecord(version) ||
      typeof version.version_id !== "string" ||
      version.version_id === "" ||
      typeof version.percentage !== "number"
    ) {
      unexpected(read, args, "版本缺少 version_id 或 percentage");
    }
    if (best === null || version.percentage > best.percentage) {
      best = { id: version.version_id, percentage: version.percentage };
    }
  }
  if (best === null) unexpected(read, args, "第一条部署没有任何版本");
  return best.id;
}

/** The Worker Version's `workers/tag`, or null when it has none. */
export function versionTag(
  output: unknown,
  args: Array<string> = [],
): string | null {
  if (!isRecord(output)) unexpected("version", args, "不是一个对象");
  const { annotations } = output;
  if (annotations === undefined || annotations === null) return null;
  if (!isRecord(annotations)) {
    unexpected("version", args, "annotations 不是一个对象");
  }
  const tag = annotations["workers/tag"];
  if (tag === undefined || tag === null) return null;
  // A tag of another type is still a tag that names no version.
  return typeof tag === "string" ? tag : JSON.stringify(tag);
}

/** The version a tag names: `v` followed by a valid version, written canonically. */
export function tagVersion(tag: string): string | null {
  if (!tag.startsWith("v")) return null;
  const parsed = parseAppVersion(tag.slice(1));
  if (!parsed) return null;
  const version = formatAppVersion(parsed);
  return version === tag.slice(1) ? version : null;
}

/** The rows of a `cf d1 query` with one statement. */
export function queryRows(
  read: "table" | "count",
  output: unknown,
  args: Array<string> = [],
): Array<unknown> {
  if (!Array.isArray(output) || output.length !== 1) {
    unexpected(read, args, "不是只含一条结果的列表");
  }
  const [result] = output;
  if (!isRecord(result) || !Array.isArray(result.results)) {
    unexpected(read, args, "结果没有 results 列表");
  }
  if (result.success !== true) unexpected(read, args, "success 不是 true");
  return result.results;
}

function migrationCount(output: unknown, args: Array<string>) {
  const [row] = queryRows("count", output, args);
  if (!isRecord(row) || typeof row.n !== "number" || !(row.n >= 0)) {
    unexpected("count", args, "没有数字 n");
  }
  return row.n;
}

/** Whether D1 records migrations: what tells a pre-gate site from a fresh install. */
function hasMigrations(cf: Cf, databaseId: string) {
  const tableArgs = ["d1", "query", databaseId, "--sql", TABLE_EXISTS_SQL];
  const table = run(cf, "table", tableArgs);
  if (table.status !== 0) throw failedRun("table", tableArgs, table);
  const tables = queryRows("table", json("table", tableArgs, table.stdout));
  if (tables.length === 0) return false;

  const countArgs = ["d1", "query", databaseId, "--sql", MIGRATION_COUNT_SQL];
  const count = run(cf, "count", countArgs);
  if (count.status !== 0) throw failedRun("count", countArgs, count);
  return migrationCount(json("count", countArgs, count.stdout), countArgs) > 0;
}

function asFailure(error: unknown): ReadFailure {
  if (error instanceof ReadError) {
    return {
      read: READS[error.read],
      command: `cf ${error.args.map(quote).join(" ")}`,
      detail: error.detail,
    };
  }
  throw error;
}

function quote(arg: string) {
  return /^[\w./:=@-]+$/.test(arg) ? arg : `"${arg.replaceAll('"', '\\"')}"`;
}

/** What is live on `worker`, reading D1 `databaseId` only when no tag names a version. */
export function readLiveState(
  cf: Cf,
  worker: string,
  databaseId: string,
): LiveRead {
  try {
    const listArgs = ["workers", "deployments", "list", "--worker", worker];
    const list = run(cf, "deployments", listArgs);

    let via: Exclude<Extract<LiveRead, { ok: true }>["via"], "tag">;
    let tag: string | undefined;
    if (isNoWorker(list)) {
      via = "no-worker";
    } else {
      if (list.status !== 0) throw failedRun("deployments", listArgs, list);
      const id = servingVersionId(
        json("deployments", listArgs, list.stdout),
        listArgs,
      );
      if (id === null) {
        via = "no-deployment";
      } else {
        const getArgs = ["workers", "versions", "get", id, "--worker", worker];
        const got = run(cf, "version", getArgs);
        if (got.status !== 0) throw failedRun("version", getArgs, got);
        const found = versionTag(json("version", getArgs, got.stdout), getArgs);
        if (found === null) {
          via = "no-tag";
        } else {
          const version = tagVersion(found);
          if (version !== null) {
            return {
              ok: true,
              state: { kind: "version", version },
              via: "tag",
              tag: found,
            };
          }
          via = "tag-not-version";
          tag = found;
        }
      }
    }

    const state: LiveState = hasMigrations(cf, databaseId)
      ? { kind: "pre-gate" }
      : { kind: "fresh" };
    return { ok: true, state, via, ...(tag === undefined ? {} : { tag }) };
  } catch (error) {
    return { ok: false, failure: asFailure(error) };
  }
}

/** The Worker's Secret names; none when the Worker does not exist. */
export function readSecretNames(
  cf: Cf,
  worker: string,
): { ok: true; names: Array<string> } | { ok: false; failure: ReadFailure } {
  const args = ["workers", "secrets", "list", "--worker", worker];
  try {
    const result = run(cf, "secrets", args);
    if (isNoWorker(result)) return { ok: true, names: [] };
    if (result.status !== 0) throw failedRun("secrets", args, result);
    const output = json("secrets", args, result.stdout);
    if (!Array.isArray(output)) unexpected("secrets", args, "不是一个列表");
    const names = output.map((secret) => {
      if (!isRecord(secret) || typeof secret.name !== "string") {
        unexpected("secrets", args, "条目缺少 name");
      }
      return secret.name;
    });
    return { ok: true, names };
  } catch (error) {
    return { ok: false, failure: asFailure(error) };
  }
}

/** The log text for a failed read. */
export function formatReadFailure(failure: ReadFailure): string {
  return [
    `部署前检查未通过，构建已停止：无法${failure.read}。线上的博客没有改动，继续运行原来的版本。`,
    "",
    `命令：${failure.command}`,
    failure.detail,
    "",
    "接下来的数据库迁移和部署要用同样的权限访问同样的接口，所以这一步不会跳过。请检查构建使用的 Cloudflare API token 是否有权读取这个 Worker 和 D1 数据库，以及 WORKER_NAME、D1_DATABASE_ID 是否填写正确，然后重试这次构建（Retry build）。",
  ].join("\n");
}

// --- Deciding -------------------------------------------------------------

export type PreflightInput = {
  live: LiveState;
  /** This build's version (package.json). */
  version: string;
  /** This build's own upgrades.json, as the reader returns it. */
  file: UpgradesFile;
  /** Names of the environment variables the deploy command sees. */
  envNames: ReadonlyArray<string>;
  /** The Worker's Secret names; "unknown" for a fresh install, which skips them. */
  secretNames: ReadonlyArray<string> | "unknown";
  /** The value of UPGRADE_ACK, when set. */
  ack: string | undefined;
};

export type Missing = { name: string; version: string };

export type PreflightDecision = {
  ok: boolean;
  /** "not-needed": same major or fresh. Otherwise how UPGRADE_ACK stands. */
  ack: "not-needed" | "given" | "missing" | "wrong";
  missingBuildVars: Array<Missing>;
  missingSecrets: Array<Missing>;
  /** What to print: one line on success, the steps on failure. */
  text: string;
};

function majorOf(version: string) {
  const parsed = parseAppVersion(version);
  if (!parsed) throw new Error(`Invalid application version: ${version}`);
  return parsed.major;
}

function liveDescription(live: Exclude<LiveState, { kind: "fresh" }>) {
  return live.kind === "version"
    ? `线上版本 ${live.version}`
    : `线上没有带版本标签的 Worker 版本，D1 已有迁移记录，按闸门上线前安装的站点处理（视为 ${PRE_GATE_VERSION}）`;
}

export function decidePreflight(input: PreflightInput): PreflightDecision {
  const { live, version, file } = input;
  const thisMajor = majorOf(version);

  if (live.kind === "fresh") {
    return {
      ok: true,
      ack: "not-needed",
      missingBuildVars: [],
      missingSecrets: [],
      text: `部署前检查：线上没有带版本标签的 Worker 版本，D1 也没有迁移记录，按全新安装处理；本次版本 ${version}，继续部署。`,
    };
  }

  const liveVersion = live.kind === "version" ? live.version : PRE_GATE_VERSION;
  const liveMajor = majorOf(liveVersion);
  const crossing = liveMajor !== thisMajor;
  const entries = entriesBetween(file, liveVersion, version);

  const ackValue = input.ack?.trim();
  const ack: PreflightDecision["ack"] = !crossing
    ? "not-needed"
    : ackValue === String(thisMajor)
      ? "given"
      : ackValue === undefined || ackValue === ""
        ? "missing"
        : "wrong";

  const env = new Set(input.envNames);
  const secrets =
    input.secretNames === "unknown" ? null : new Set(input.secretNames);
  const missingBuildVars: Array<Missing> = [];
  const missingSecrets: Array<Missing> = [];
  for (const entry of entries) {
    for (const name of entry.requires?.buildVars ?? []) {
      if (!env.has(name))
        missingBuildVars.push({ name, version: entry.version });
    }
    for (const name of entry.requires?.secrets ?? []) {
      if (secrets && !secrets.has(name)) {
        missingSecrets.push({ name, version: entry.version });
      }
    }
  }

  const ok =
    (ack === "not-needed" || ack === "given") &&
    missingBuildVars.length === 0 &&
    missingSecrets.length === 0;

  const where = `${liveDescription(live)}，本次版本 ${version}`;
  if (ok) {
    return {
      ok,
      ack,
      missingBuildVars,
      missingSecrets,
      text: crossing
        ? `部署前检查：${where}，跨越大版本（${liveMajor} → ${thisMajor}），${ACK_VARIABLE}=${thisMajor} 已确认，继续部署。`
        : `部署前检查：${where}，同一大版本，继续部署。`,
    };
  }

  const lines = [
    "部署前检查未通过，构建已停止。线上的博客没有改动，继续运行原来的版本。",
    "",
  ];
  const up = thisMajor > liveMajor;
  if (!crossing) {
    lines.push(`${where}，同一大版本，但缺少本次版本需要的配置。`);
  } else if (ack === "given") {
    lines.push(
      `${where}，跨越大版本（${liveMajor} → ${thisMajor}），${ACK_VARIABLE}=${thisMajor} 已确认，但缺少本次版本需要的配置。`,
    );
  } else if (up) {
    lines.push(
      `${where}，跨越大版本（${liveMajor} → ${thisMajor}）。大版本升级前必须先手动完成一些事项，否则升级后博客可能无法正常运行。`,
    );
  } else {
    lines.push(
      `${where}，降到更低的大版本（${liveMajor} → ${thisMajor}）。`,
      "降级没有可列出的事项，但新版本可能已经改动了数据库，数据不一定还能被旧版本的代码使用。只有在确认数据可用（例如已从备份恢复数据库）时才继续。",
    );
  }

  // Numbered across groups: the `before` items of each version crossed, oldest
  // first, then the missing configuration.
  // An acknowledged crossing has had its items read; only what is missing remains.
  const listBefore = crossing && ack !== "given";
  const groups: Array<{ heading: string; steps: Array<string> }> = [];
  if (listBefore) {
    for (const entry of entries) {
      if (!entry.before?.length) continue;
      groups.push({
        heading: `v${entry.version} 升级前`,
        steps: entry.before.map((item) => item.text),
      });
    }
  }
  const hasBefore = groups.length > 0;
  const configuration = [
    ...missingBuildVars.map(
      ({ name, version: needs }) =>
        `在 ${BUILD_VARIABLES_PLACE} 中添加变量 ${name}（${needs} 需要）。`,
    ),
    ...missingSecrets.map(
      ({ name, version: needs }) =>
        `在 ${SECRETS_PLACE} 中以 Secret 类型添加 ${name}（${needs} 需要）。`,
    ),
  ];
  if (configuration.length > 0) {
    groups.push({ heading: "缺少的配置", steps: configuration });
  }

  if (listBefore && up && !hasBefore) {
    lines.push(
      "",
      "这次跨越的版本在 upgrades.json 中没有记录升级前事项，请先阅读下面的升级说明和对应版本的发布说明。",
    );
  }

  if (groups.length > 0) {
    lines.push("", "请先完成以下事项：");
    let number = 0;
    for (const group of groups) {
      lines.push("", `  ${group.heading}`);
      for (const step of group.steps) {
        number += 1;
        lines.push(`  ${number}. ${step}`);
      }
    }
  }
  const hasSteps = groups.length > 0;

  if (ack === "missing" || ack === "wrong") {
    const confirm = hasSteps ? "确认以上事项都已完成后" : "确认要继续后";
    lines.push(
      "",
      ack === "missing"
        ? `${confirm}，在 ${BUILD_VARIABLES_PLACE} 中添加变量：`
        : `${confirm}，在 ${BUILD_VARIABLES_PLACE} 中把 ${ACK_VARIABLE} 的值从 ${ackValue} 改为 ${thisMajor}（${ackValue} 确认的是另一个大版本）：`,
      "",
      `  ${ACK_VARIABLE}=${thisMajor}`,
    );
    lines.push("", `升级说明：${UPGRADE_GUIDE_URL}`);
  }

  lines.push(
    "",
    "最后重试这次构建（Retry build）。以上都已完成时，检查会通过并继续迁移数据库和部署。",
  );

  return { ok, ack, missingBuildVars, missingSecrets, text: lines.join("\n") };
}
