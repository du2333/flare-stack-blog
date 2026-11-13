/**
 * The logic of scripts/rehearse-deploy.ts with every side effect injected: the
 * settings, the fork-branch check, reading `cf builds` output, the poll loop
 * and the whole sequence. The tests drive it with stubs.
 */

export type Settings = {
  /** `owner/repo` of the fork the rehearsal Worker builds from. */
  fork: string;
  /** Script tag of the rehearsal Worker (what `cf builds create` takes). */
  worker: string;
  /** Cloudflare account that owns the Worker; a login with several accounts needs it. */
  accountId: string;
  /** The rehearsal site's address. */
  siteUrl: string;
  /** Branch of the fork the Worker builds. */
  branch: string;
  /** Git remote name or URL to push to; defaults to the fork's HTTPS URL. */
  remote: string;
  /** `cf` auth profile, when the login has several. */
  profile?: string;
};

type Source = { env: string; toml: string; what: string };

const REQUIRED: Array<
  Source & { key: "fork" | "worker" | "accountId" | "siteUrl" }
> = [
  {
    key: "fork",
    env: "REHEARSAL_FORK",
    toml: "fork",
    what: "the fork the rehearsal Worker builds from, as owner/repo",
  },
  {
    key: "worker",
    env: "REHEARSAL_WORKER",
    toml: "worker",
    what: 'the rehearsal Worker\'s script tag (`bunx cf cli search "list workers"` finds it)',
  },
  {
    key: "accountId",
    env: "REHEARSAL_ACCOUNT_ID",
    toml: "account_id",
    what: "the Cloudflare account id that owns the Worker (also read from CLOUDFLARE_ACCOUNT_ID); without it a login with several accounts stops the cf commands",
  },
  {
    key: "siteUrl",
    env: "REHEARSAL_SITE_URL",
    toml: "site_url",
    what: "the rehearsal site's address, https://...",
  },
];

export const CONFIG_FILE = "~/.config/flare-stack-blog/rehearsal.toml";

/** The branches a rehearsal must never overwrite, wherever the fork's remote points. */
const PROTECTED_BRANCHES = ["main", "master", "dev"];

/** Flat `key = "value"` lines and `#` comments: all the config file holds. */
export function parseFlatToml(text: string) {
  const values: Record<string, string> = {};
  for (const [index, raw] of text.split("\n").entries()) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const match =
      /^([A-Za-z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^#\s]+))\s*(?:#.*)?$/.exec(
        line,
      );
    if (!match) {
      throw new Error(
        `${CONFIG_FILE}, line ${index + 1}: expected key = "value", got: ${line}`,
      );
    }
    values[match[1]!] = match[2] ?? match[3] ?? match[4]!;
  }
  return values;
}

/**
 * Environment variables win over the file. Returns the settings, or the
 * problems (one line each, saying what to set and where).
 */
export function resolveSettings(
  env: Record<string, string | undefined>,
  file: Record<string, string>,
): { settings: Settings } | { problems: Array<string> } {
  const problems: Array<string> = [];
  const read = (envName: string, tomlKey: string) =>
    (env[envName] || file[tomlKey] || "").trim();

  const found: Record<string, string> = {};
  for (const item of REQUIRED) {
    let value = read(item.env, item.toml);
    if (item.key === "accountId" && !value)
      value = (env.CLOUDFLARE_ACCOUNT_ID ?? "").trim();
    if (!value) {
      problems.push(
        `${item.env} (or \`${item.toml}\` in ${CONFIG_FILE}) is not set: ${item.what}.`,
      );
    }
    found[item.key] = value;
  }
  if (found.fork && !/^[\w.-]+\/[\w.-]+$/.test(found.fork)) {
    problems.push(`fork must look like owner/repo, got: ${found.fork}`);
  }
  if (found.siteUrl && !/^https?:\/\//.test(found.siteUrl)) {
    problems.push(`site_url must start with https://, got: ${found.siteUrl}`);
  }
  const branch = read("REHEARSAL_BRANCH", "branch") || "rehearsal";
  if (PROTECTED_BRANCHES.includes(branch)) {
    problems.push(
      `branch ${branch} is a branch the blog itself builds from; pick a dedicated one (default: rehearsal).`,
    );
  }
  if (problems.length > 0) return { problems };
  const fork = found.fork!;
  return {
    settings: {
      fork,
      worker: found.worker!,
      accountId: found.accountId!,
      siteUrl: found.siteUrl!,
      branch,
      remote:
        read("REHEARSAL_REMOTE", "remote") || `https://github.com/${fork}.git`,
      profile: read("REHEARSAL_PROFILE", "profile") || undefined,
    },
  };
}

/** The shell-free argument lists of the two cf commands, one place so tests pin them. */
export function cfBuildsCreateArgs(settings: Settings) {
  return [
    "bunx",
    "cf",
    "builds",
    "create",
    settings.worker,
    "--branch",
    settings.branch,
    ...profileArgs(settings),
  ];
}
export function cfBuildsGetArgs(settings: Settings, buildUuid: string) {
  return ["bunx", "cf", "builds", "get", buildUuid, ...profileArgs(settings)];
}
function profileArgs(settings: Settings) {
  return settings.profile ? ["--profile", settings.profile] : [];
}

export function pushArgs(settings: Settings, sha: string) {
  return [
    "git",
    "push",
    "--force",
    settings.remote,
    `${sha}:refs/heads/${settings.branch}`,
  ];
}

/** `repos/<fork>/git/ref/heads/<branch>`, each branch segment encoded, slashes kept. */
export function refApiPath(settings: Settings) {
  const branch = settings.branch.split("/").map(encodeURIComponent).join("/");
  return `repos/${settings.fork}/git/ref/heads/${branch}`;
}

/** Throws unless the fork's branch points at exactly `expected`. */
export async function confirmForkBranch(
  settings: Settings,
  expected: string,
  getRemoteSha: () => Promise<string>,
) {
  const actual = await getRemoteSha();
  if (actual !== expected) {
    throw new Error(
      `${settings.fork} branch ${settings.branch} points at ${actual}, not ${expected}. The push did not land; no build was started.`,
    );
  }
}

export type BuildState =
  | { kind: "running"; status: string }
  | { kind: "success"; commit?: string }
  | { kind: "failure"; outcome: string }
  | { kind: "unparsable"; reason: string };

/** The JSON object in `cf` output, with or without the API's `result` envelope. */
function jsonObjectIn(output: string): Record<string, unknown> | undefined {
  const text = output.trim();
  const candidates = [text];
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first > 0 && last > first) candidates.push(text.slice(first, last + 1));
  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const object = parsed as Record<string, unknown>;
        const inner = object.result;
        return inner && typeof inner === "object"
          ? (inner as Record<string, unknown>)
          : object;
      }
    } catch {
      // try the next candidate
    }
  }
  return undefined;
}

export function parseBuildStart(
  output: string,
): { buildUuid: string } | { problem: string } {
  const build = jsonObjectIn(output);
  const uuid = build?.build_uuid;
  if (typeof uuid !== "string" || uuid === "") {
    return {
      problem: `cf builds create printed no build_uuid: ${output.trim().slice(0, 300)}`,
    };
  }
  return { buildUuid: uuid };
}

/** `status` is queued, initializing, running or stopped; once stopped, `build_outcome` says how. */
export function classifyBuild(output: string): BuildState {
  const build = jsonObjectIn(output);
  if (!build)
    return {
      kind: "unparsable",
      reason: output.trim().slice(0, 200) || "empty output",
    };
  const status = build.status;
  if (typeof status !== "string") {
    return { kind: "unparsable", reason: "no status field" };
  }
  if (status !== "stopped") return { kind: "running", status };
  const outcome =
    typeof build.build_outcome === "string" ? build.build_outcome : "unknown";
  if (outcome !== "success") return { kind: "failure", outcome };
  const metadata = build.build_trigger_metadata as
    | { commit_hash?: string }
    | undefined;
  return { kind: "success", commit: metadata?.commit_hash };
}

export type PollResult =
  | { kind: "success"; commit?: string; polls: number }
  | { kind: "failure"; outcome: string; polls: number }
  | { kind: "timeout"; polls: number; lastStatus: string }
  | { kind: "unreadable"; polls: number; reason: string };

/**
 * Asks for the build until it stops. Bounded twice: at most `maxPolls` asks,
 * and `maxUnreadable` unparsable or failed answers in a row. Every ending is
 * returned, none loops on.
 */
export async function pollBuild(options: {
  get: () => Promise<string>;
  sleep: (ms: number) => Promise<void>;
  intervalMs: number;
  maxPolls: number;
  maxUnreadable: number;
  onPoll?: (poll: number, state: BuildState) => void;
}): Promise<PollResult> {
  let unreadable = 0;
  let lastStatus = "not yet seen";
  for (let poll = 1; poll <= options.maxPolls; poll++) {
    let state: BuildState;
    try {
      state = classifyBuild(await options.get());
    } catch (error) {
      state = { kind: "unparsable", reason: (error as Error).message };
    }
    options.onPoll?.(poll, state);
    if (state.kind === "success")
      return { kind: "success", commit: state.commit, polls: poll };
    if (state.kind === "failure")
      return { kind: "failure", outcome: state.outcome, polls: poll };
    if (state.kind === "unparsable") {
      unreadable++;
      if (unreadable >= options.maxUnreadable) {
        return { kind: "unreadable", polls: poll, reason: state.reason };
      }
    } else {
      unreadable = 0;
      lastStatus = state.status;
    }
    if (poll < options.maxPolls) await options.sleep(options.intervalMs);
  }
  return { kind: "timeout", polls: options.maxPolls, lastStatus };
}

export type Deps = {
  log: (line: string) => void;
  /** Commits the push; throws with git's message when it fails. */
  push: (args: Array<string>) => Promise<void>;
  getRemoteSha: () => Promise<string>;
  /** Runs a cf command with the settings' account in its environment; returns stdout, throws on a non-zero exit. */
  cf: (args: Array<string>) => Promise<string>;
  sleep: (ms: number) => Promise<void>;
  /** HTTP status of the site, or throws when it cannot be reached. */
  siteStatus: (url: string) => Promise<number>;
};

export type Limits = {
  intervalMs: number;
  maxPolls: number;
  maxUnreadable: number;
  siteAttempts: number;
};

/** The whole sequence. Throws with a message for every way it can stop short. */
export async function rehearse(
  settings: Settings,
  sha: string,
  deps: Deps,
  limits: Limits,
) {
  const { log } = deps;
  log(
    `Pushing ${sha.slice(0, 8)} to ${settings.fork} branch ${settings.branch}`,
  );
  await deps.push(pushArgs(settings, sha));

  await confirmForkBranch(settings, sha, deps.getRemoteSha);
  log(
    `Confirmed: ${settings.fork} ${settings.branch} is at ${sha.slice(0, 8)}`,
  );

  const started = parseBuildStart(await deps.cf(cfBuildsCreateArgs(settings)));
  if ("problem" in started) throw new Error(started.problem);
  log(`Build ${started.buildUuid} started`);

  const result = await pollBuild({
    get: () => deps.cf(cfBuildsGetArgs(settings, started.buildUuid)),
    sleep: deps.sleep,
    intervalMs: limits.intervalMs,
    maxPolls: limits.maxPolls,
    maxUnreadable: limits.maxUnreadable,
    onPoll: (poll, state) =>
      log(
        `  poll ${poll}: ${state.kind === "running" ? state.status : state.kind === "unparsable" ? `unreadable (${state.reason})` : state.kind === "failure" ? `stopped, ${state.outcome}` : "stopped, success"}`,
      ),
  });
  switch (result.kind) {
    case "success":
      if (result.commit && result.commit !== sha) {
        throw new Error(
          `The build succeeded but built ${result.commit}, not ${sha}.`,
        );
      }
      log(`Build succeeded after ${result.polls} poll(s)`);
      break;
    case "failure":
      throw new Error(
        `The build stopped with outcome ${result.outcome} (build ${started.buildUuid}). Read its logs in the Cloudflare dashboard or with \`bunx cf cli search "get build logs"\`.`,
      );
    case "timeout":
      throw new Error(
        `The build was still ${result.lastStatus} after ${result.polls} polls (build ${started.buildUuid}); it may yet finish. Check it with \`bunx cf builds get ${started.buildUuid}\`.`,
      );
    case "unreadable":
      throw new Error(
        `\`cf builds get\` gave output this script cannot read ${limits.maxUnreadable} times in a row (build ${started.buildUuid}): ${result.reason}`,
      );
    default:
      result satisfies never;
  }

  let status = 0;
  for (let attempt = 1; attempt <= limits.siteAttempts; attempt++) {
    try {
      status = await deps.siteStatus(settings.siteUrl);
    } catch (error) {
      status = 0;
      log(`  site attempt ${attempt}: ${(error as Error).message}`);
    }
    if (status >= 200 && status < 400) break;
    if (status !== 0) log(`  site attempt ${attempt}: HTTP ${status}`);
    if (attempt < limits.siteAttempts) await deps.sleep(limits.intervalMs);
  }
  if (status < 200 || status >= 400) {
    throw new Error(
      `The build succeeded but ${settings.siteUrl} does not answer (last status ${status || "no response"}).`,
    );
  }
  log(`Site answers: HTTP ${status}`);
}
