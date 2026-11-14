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
 * | the deployments one list call returns, newest first | D1 `d1_migrations` | state            |
 * |------------------------------------------------------|--------------------|------------------|
 * | one's serving version is tagged `v<version>`         | not read           | that version     |
 * | none is tagged so, none at all, or no Worker (10007) | has rows           | pre-gate (3.0.0) |
 * | the same                                             | missing or empty   | fresh install    |
 * | any read fails                                       |                    | the preflight fails |
 *
 * The deployments are walked back because a change in the dashboard (a Secret
 * added, a variable edited) creates a new Worker Version that may not carry
 * the tag of the version it was made from.
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
  type UnreleasedEntry,
  type UpgradeEntry,
  type UpgradesFile,
} from "../src/lib/version/upgrades.ts";

/**
 * The version a site installed before the gate existed is taken to run: the
 * first of the major the gate ships in. Such a site has migrations in D1 but
 * no tagged Worker Version.
 */
export const PRE_GATE_VERSION = "3.0.0";

/**
 * The most deployments walked for a tag. One `cf workers deployments list`
 * call without paging flags returns the most recent ones (10 when this was
 * written); a longer list is cut here rather than paged.
 */
export const MAX_DEPLOYMENTS_WALKED = 10;

/** The build variable that acknowledges a move to another major. */
export const ACK_VARIABLE = "UPGRADE_ACK";

/** The deployment guide's section on crossing a major. */
export const UPGRADE_GUIDE_URL = `https://github.com/du2333/flare-stack-blog/blob/main/docs/deployment.md#${encodeURIComponent("跨大版本升级")}`;

const BUILD_VARIABLES_PLACE = "Worker 的 Settings → Builds → Build variables";
const SECRETS_PLACE = "Worker 的 Settings → Runtime variables and secrets";
const STOPPED = "部署前检查未通过，构建已停止";
const RETRY = "重试这次构建（Retry build）";

export type LiveState =
  /** `deployment` counts from the newest, 1. */
  | { kind: "version"; version: string; deployment: number }
  /** `untagged` deployments were walked; 0 when there is no Worker or no deployment. */
  | { kind: "pre-gate"; untagged: number }
  | { kind: "fresh" };

/** An environment variable set to an empty value counts as missing. */
function isSet(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== "";
}

// --- Setup ----------------------------------------------------------------

type Env = Readonly<Record<string, string | undefined>>;

export type Setup =
  | { ok: true; version: string; worker: string; databaseId: string }
  | { ok: false; text: string };

/**
 * This build's version, and the names the reads need. The deploy step tags
 * with the shell's `$npm_package_version`, so it has to be the version
 * decided on here, or the next preflight reads the wrong one. The Worker name
 * and database id are used as the migration step uses them, untrimmed.
 */
export function checkSetup(packageVersion: unknown, env: Env): Setup {
  const parsed =
    typeof packageVersion === "string" ? parseAppVersion(packageVersion) : null;
  if (!parsed) {
    return {
      ok: false,
      text: `${STOPPED}：package.json 中的 version（${String(packageVersion)}）不是合法的版本号。`,
    };
  }
  const version = formatAppVersion(parsed);

  const tagged = env.npm_package_version;
  if (tagged !== version) {
    const state =
      tagged === undefined
        ? "没有设置"
        : tagged.trim() === ""
          ? "它的值为空"
          : `它的值是 ${tagged}`;
    return {
      ok: false,
      text: `${STOPPED}：部署标签取自环境变量 npm_package_version，${state}，而 package.json 中的版本是 ${version}。请通过 \`bun run deploy\` 运行部署，不要单独运行这个脚本。`,
    };
  }

  const worker = env.WORKER_NAME;
  const databaseId = env.D1_DATABASE_ID;
  if (!isSet(worker) || !isSet(databaseId)) {
    const unset = [
      ...(isSet(worker) ? [] : ["WORKER_NAME"]),
      ...(isSet(databaseId) ? [] : ["D1_DATABASE_ID"]),
    ];
    return {
      ok: false,
      text: `${STOPPED}：缺少构建变量 ${unset.join("、")}。请在 ${BUILD_VARIABLES_PLACE} 中添加后${RETRY}。`,
    };
  }
  return { ok: true, version, worker, databaseId };
}

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
  | { ok: true; state: LiveState }
  | { ok: false; failure: ReadFailure };

export type SecretsRead =
  | { ok: true; names: Array<string> }
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

function lastLines(text: string, count = 20) {
  return text.trim().split(/\r?\n/).slice(-count).join("\n");
}

/**
 * Runs one read and returns its parsed JSON. A read fails when `cf` cannot
 * start, exits non-zero or prints something other than JSON; with
 * `noWorker`, an exit for error 10007 (the Worker does not exist) returns
 * null instead.
 */
function readJson(
  cf: Cf,
  read: Read,
  args: Array<string>,
  { noWorker = false } = {},
): unknown {
  const result = cf(args);
  if (result.error) {
    throw new ReadError(read, args, `无法运行 cf：${result.error}`);
  }
  if (result.status !== 0) {
    if (noWorker && /\[10007\]/.test(result.stderr)) return null;
    const output = lastLines(result.stderr) || lastLines(result.stdout);
    throw new ReadError(
      read,
      args,
      `退出码 ${result.status}${output ? `，输出：\n${output}` : "，没有输出"}`,
    );
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new ReadError(
      read,
      args,
      `输出不是 JSON：\n${lastLines(result.stdout) || "（空）"}`,
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
 * For each listed deployment, newest first and at most
 * `MAX_DEPLOYMENTS_WALKED`, the version with the largest percentage (the
 * first of equals). Empty when there is no deployment.
 */
export function servingVersionIds(
  output: unknown,
  args: Array<string> = [],
): Array<string> {
  const read = "deployments";
  if (!isRecord(output) || !Array.isArray(output.deployments)) {
    unexpected(read, args, "没有 deployments 列表");
  }
  return output.deployments
    .slice(0, MAX_DEPLOYMENTS_WALKED)
    .map((deployment) => {
      if (!isRecord(deployment) || !Array.isArray(deployment.versions)) {
        unexpected(read, args, "部署没有 versions 列表");
      }
      let best: { id: string; percentage: number } | null = null;
      for (const version of deployment.versions) {
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
      if (best === null) unexpected(read, args, "部署没有任何版本");
      return best.id;
    });
}

/** The version a tag names: exactly `v` followed by a valid version. */
export function tagVersion(tag: unknown): string | null {
  if (typeof tag !== "string" || !tag.startsWith("v")) return null;
  const parsed = parseAppVersion(tag.slice(1));
  if (!parsed) return null;
  const version = formatAppVersion(parsed);
  return version === tag.slice(1) ? version : null;
}

/** The version a Worker Version's `workers/tag` names, or null for none. */
export function taggedVersion(
  output: unknown,
  args: Array<string> = [],
): string | null {
  if (!isRecord(output)) unexpected("version", args, "不是一个对象");
  const { annotations } = output;
  if (annotations === undefined || annotations === null) return null;
  if (!isRecord(annotations)) {
    unexpected("version", args, "annotations 不是一个对象");
  }
  return tagVersion(annotations["workers/tag"]);
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

/** Whether D1 records migrations: what tells a pre-gate site from a fresh install. */
function hasMigrations(cf: Cf, databaseId: string) {
  const tableArgs = ["d1", "query", databaseId, "--sql", TABLE_EXISTS_SQL];
  const tables = queryRows(
    "table",
    readJson(cf, "table", tableArgs),
    tableArgs,
  );
  if (tables.length === 0) return false;

  const countArgs = ["d1", "query", databaseId, "--sql", MIGRATION_COUNT_SQL];
  const [row] = queryRows("count", readJson(cf, "count", countArgs), countArgs);
  if (!isRecord(row) || typeof row.n !== "number" || !(row.n >= 0)) {
    unexpected("count", countArgs, "没有数字 n");
  }
  return row.n > 0;
}

function quote(arg: string) {
  return /^[\w./:=@-]+$/.test(arg) ? arg : `"${arg.replaceAll('"', '\\"')}"`;
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

/**
 * What is live on `worker`: the first deployment, newest first, whose serving
 * version is tagged with a version. D1 `databaseId` is read only when none is.
 */
export function readLiveState(
  cf: Cf,
  worker: string,
  databaseId: string,
): LiveRead {
  try {
    const listArgs = ["workers", "deployments", "list", "--worker", worker];
    const list = readJson(cf, "deployments", listArgs, { noWorker: true });
    const ids = list === null ? [] : servingVersionIds(list, listArgs);

    // A version serving several deployments in a row is read once.
    const read = new Map<string, string | null>();
    for (const [index, id] of ids.entries()) {
      let version = read.get(id);
      if (version === undefined) {
        const getArgs = ["workers", "versions", "get", id, "--worker", worker];
        version = taggedVersion(readJson(cf, "version", getArgs), getArgs);
        read.set(id, version);
      }
      if (version !== null) {
        return {
          ok: true,
          state: { kind: "version", version, deployment: index + 1 },
        };
      }
    }

    return {
      ok: true,
      state: hasMigrations(cf, databaseId)
        ? { kind: "pre-gate", untagged: ids.length }
        : { kind: "fresh" },
    };
  } catch (error) {
    return { ok: false, failure: asFailure(error) };
  }
}

/** The Worker's Secret names. */
export function readSecretNames(cf: Cf, worker: string): SecretsRead {
  const args = ["workers", "secrets", "list", "--worker", worker];
  try {
    const output = readJson(cf, "secrets", args);
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
    `${STOPPED}：无法${failure.read}。线上的博客没有改动，继续运行原来的版本。`,
    "",
    `命令：${failure.command}`,
    failure.detail,
    "",
    `接下来的数据库迁移和部署要用同样的权限访问同样的接口，所以这一步不会跳过。请检查构建使用的 Cloudflare API token 是否有权读取这个 Worker 和 D1 数据库，以及 WORKER_NAME、D1_DATABASE_ID 是否填写正确，然后${RETRY}。`,
  ].join("\n");
}

// --- Deciding -------------------------------------------------------------

export type PreflightInput = {
  live: LiveState;
  /** This build's version (package.json). */
  version: string;
  /** This build's own upgrades.json, as the reader returns it. */
  file: UpgradesFile;
  /** The file's `unreleased` entry: a prerelease build's own notes. */
  unreleased: UnreleasedEntry | null;
  /** The deploy command's environment: Build variables and UPGRADE_ACK. */
  env: Env;
  /** Called only when a Secret requirement has to be checked. */
  readSecrets: () => SecretsRead;
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

type Notes = Pick<UpgradeEntry, "version" | "before" | "requires">;

function majorOf(version: string) {
  const parsed = parseAppVersion(version);
  if (!parsed) throw new Error(`Invalid application version: ${version}`);
  return parsed.major;
}

function isPrerelease(version: string) {
  return (parseAppVersion(version)?.prerelease.length ?? 0) > 0;
}

/** How the live version was found, so a fallback shows in the log. */
export function liveDescription(live: LiveState): string {
  switch (live.kind) {
    case "version":
      return live.deployment === 1
        ? `线上版本 ${live.version}（取自最近一次部署的版本标签）`
        : `线上版本 ${live.version}（取自最近第 ${live.deployment} 次部署的版本标签，较新的 ${live.deployment - 1} 次部署没有版本标签）`;
    case "pre-gate":
      return `${
        live.untagged === 0
          ? "线上没有这个 Worker 的部署"
          : `最近 ${live.untagged} 次部署都没有版本标签`
      }，D1 已有迁移记录，按闸门上线前安装的站点处理（视为 ${PRE_GATE_VERSION}）`;
    case "fresh":
      return "线上没有带版本标签的部署，D1 也没有迁移记录，按全新安装处理";
    default:
      return live satisfies never;
  }
}

/**
 * Within a major everything proceeds. Across a major UPGRADE_ACK must name
 * this build's major; upwards, the configuration the versions crossed
 * require must also be present. Required configuration is a breaking change,
 * so only a major carries it.
 */
export function decidePreflight(input: PreflightInput): PreflightDecision {
  const { live, version } = input;
  const thisMajor = majorOf(version);
  const where = `${liveDescription(live)}；本次版本 ${version}`;
  const decision = (
    ok: boolean,
    ack: PreflightDecision["ack"],
    text: string,
    missingBuildVars: Array<Missing> = [],
    missingSecrets: Array<Missing> = [],
  ): PreflightDecision => ({
    ok,
    ack,
    missingBuildVars,
    missingSecrets,
    text,
  });

  if (live.kind === "fresh") {
    return decision(true, "not-needed", `部署前检查：${where}，继续部署。`);
  }
  const liveVersion = live.kind === "version" ? live.version : PRE_GATE_VERSION;
  const liveMajor = majorOf(liveVersion);
  if (liveMajor === thisMajor) {
    return decision(
      true,
      "not-needed",
      `部署前检查：${where}，同一大版本，继续部署。`,
    );
  }

  const ackValue = input.env[ACK_VARIABLE]?.trim();
  const ack: PreflightDecision["ack"] =
    ackValue === String(thisMajor)
      ? "given"
      : isSet(ackValue)
        ? "wrong"
        : "missing";
  const up = thisMajor > liveMajor;

  // Upwards, the notes of every version crossed; a prerelease build's own
  // notes are the file's `unreleased`. A downgrade crosses none.
  const crossed: Array<Notes> = up
    ? [
        ...entriesBetween(input.file, liveVersion, version),
        ...(isPrerelease(version) && input.unreleased
          ? [{ ...input.unreleased, version }]
          : []),
      ]
    : [];

  const missingBuildVars: Array<Missing> = [];
  for (const entry of crossed) {
    for (const name of entry.requires?.buildVars ?? []) {
      if (!isSet(input.env[name])) {
        missingBuildVars.push({ name, version: entry.version });
      }
    }
  }

  // Secrets are read only when one is required and the Worker has been
  // deployed: none can be added before the Worker exists.
  const noDeployment = live.kind === "pre-gate" && live.untagged === 0;
  const missingSecrets: Array<Missing> = [];
  if (
    !noDeployment &&
    crossed.some((entry) => (entry.requires?.secrets.length ?? 0) > 0)
  ) {
    const secrets = input.readSecrets();
    if (!secrets.ok) {
      return decision(false, ack, formatReadFailure(secrets.failure));
    }
    const names = new Set(secrets.names);
    for (const entry of crossed) {
      for (const name of entry.requires?.secrets ?? []) {
        if (!names.has(name)) {
          missingSecrets.push({ name, version: entry.version });
        }
      }
    }
  }

  if (
    ack === "given" &&
    missingBuildVars.length === 0 &&
    missingSecrets.length === 0
  ) {
    return decision(
      true,
      ack,
      `部署前检查：${where}，跨越大版本（${liveMajor} → ${thisMajor}），${ACK_VARIABLE}=${thisMajor} 已确认，继续部署。`,
    );
  }

  const lines = [`${STOPPED}。线上的博客没有改动，继续运行原来的版本。`, ""];
  if (ack === "given") {
    lines.push(
      `${where}，跨越大版本（${liveMajor} → ${thisMajor}），${ACK_VARIABLE}=${thisMajor} 已确认，但缺少新版本需要的配置。`,
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
  if (noDeployment && ack !== "given") {
    lines.push(
      "",
      "没有部署但 D1 已有迁移记录，也可能是第一次部署在数据库迁移之后失败了。如果是这样，不需要先完成任何事项，直接添加下面的变量即可。",
    );
  }

  // Numbered across groups: the `before` items of each version crossed,
  // oldest first, then the missing configuration. An acknowledged crossing
  // has had its items read; only what is missing remains.
  const groups: Array<{ heading: string; steps: Array<string> }> = [];
  if (ack !== "given") {
    for (const entry of crossed) {
      if (!entry.before?.length) continue;
      groups.push({
        heading: `v${entry.version} 升级前`,
        steps: entry.before.map((item) => item.text),
      });
    }
    if (up && groups.length === 0) {
      lines.push(
        "",
        "这次跨越的版本在 upgrades.json 中没有记录升级前事项，请先阅读下面的升级说明和对应版本的发布说明。",
      );
    }
  }
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

  if (ack !== "given") {
    const confirm =
      groups.length > 0 ? "确认以上事项都已完成后" : "确认要继续后";
    lines.push(
      "",
      ack === "missing"
        ? `${confirm}，在 ${BUILD_VARIABLES_PLACE} 中添加变量：`
        : `${confirm}，在 ${BUILD_VARIABLES_PLACE} 中把 ${ACK_VARIABLE} 的值从 ${ackValue} 改为 ${thisMajor}（${ackValue} 确认的是另一个大版本）：`,
      "",
      `  ${ACK_VARIABLE}=${thisMajor}`,
      "",
      `升级说明：${UPGRADE_GUIDE_URL}`,
    );
  }

  lines.push(
    "",
    `最后${RETRY}。以上都已完成时，检查会通过并继续迁移数据库和部署。`,
  );

  return decision(
    false,
    ack,
    lines.join("\n"),
    missingBuildVars,
    missingSecrets,
  );
}
