/**
 * Deploys a commit to a rehearsal Worker through Workers Builds:
 *
 *   bun scripts/rehearse-deploy.ts [<commit>] [--interval 15] [--max-polls 80] [--dry-run]
 *
 * Pushes the commit (default HEAD) to a branch of a fork that the rehearsal
 * Worker builds from, confirms through the GitHub API that the branch points
 * at exactly that commit, starts a build with `bunx cf builds create`, polls
 * `bunx cf builds get` until the build stops, then checks the site answers.
 * Any step that goes wrong ends the run with a message and exit code 1.
 *
 * Nothing about the infrastructure lives in the repo. Settings come from
 * environment variables or ~/.config/flare-stack-blog/rehearsal.toml:
 *
 *   fork       REHEARSAL_FORK        owner/repo of the fork the Worker builds
 *   worker     REHEARSAL_WORKER      the Worker's script tag
 *   account_id REHEARSAL_ACCOUNT_ID  Cloudflare account id (or CLOUDFLARE_ACCOUNT_ID)
 *   site_url   REHEARSAL_SITE_URL    the rehearsal site, https://...
 *   branch     REHEARSAL_BRANCH      optional, default "rehearsal"
 *   remote     REHEARSAL_REMOTE      optional git remote or URL, default the fork's https URL
 *   profile    REHEARSAL_PROFILE     optional cf auth profile
 *
 * Needs `gh` logged in (for the branch check) and `cf` logged in.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  CONFIG_FILE,
  cfBuildsCreateArgs,
  parseFlatToml,
  pushArgs,
  refApiPath,
  rehearse,
  resolveSettings,
  type Deps,
  type Settings,
} from "./rehearse-deploy-core.ts";

const HELP = `usage: bun scripts/rehearse-deploy.ts [<commit>] [options]

Pushes <commit> (default HEAD) to the rehearsal fork's branch, confirms the
branch is at that commit, builds it on the rehearsal Worker, waits for the
build and checks the site answers.

  --interval <s>     seconds between polls of the build (default 15)
  --max-polls <n>    polls before giving up (default 80, 20 minutes)
  --dry-run          print what would run and push nothing
  --help

Settings (environment variable, or key in ${CONFIG_FILE}):
  REHEARSAL_FORK / fork              owner/repo of the fork the Worker builds
  REHEARSAL_WORKER / worker          the Worker's script tag
  REHEARSAL_ACCOUNT_ID / account_id  Cloudflare account id (or CLOUDFLARE_ACCOUNT_ID)
  REHEARSAL_SITE_URL / site_url      the rehearsal site's address
  REHEARSAL_BRANCH / branch          optional, default "rehearsal"
  REHEARSAL_REMOTE / remote          optional git remote or URL
  REHEARSAL_PROFILE / profile        optional cf auth profile`;

function fail(message: string, code = 1): never {
  console.error(`rehearse-deploy: ${message}`);
  process.exit(code);
}

function run(args: Array<string>, env?: Record<string, string>) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>(
    (resolve, reject) => {
      const [command, ...rest] = args;
      const child = spawn(command!, rest, {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, ...env },
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
      child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
      child.on("error", reject);
      child.on("close", (status) => resolve({ status, stdout, stderr }));
    },
  );
}

function realDeps(settings: Settings): Deps {
  return {
    log: (line) => console.log(line),
    // The exit status is read directly: a pipe after `git push` would hide a failed push.
    push: async (args) => {
      const result = await run(args);
      if (result.status !== 0) {
        throw new Error(
          `\`${args.join(" ")}\` exited with ${result.status}: ${result.stderr.trim()}`,
        );
      }
    },
    getRemoteSha: async () => {
      const result = await run(["gh", "api", refApiPath(settings)]);
      if (result.status !== 0) {
        throw new Error(
          `gh api ${refApiPath(settings)} exited with ${result.status}: ${result.stderr.trim()}`,
        );
      }
      const sha = (JSON.parse(result.stdout) as { object?: { sha?: string } })
        .object?.sha;
      if (!sha)
        throw new Error(
          `gh api ${refApiPath(settings)} returned no object.sha`,
        );
      return sha;
    },
    cf: async (args) => {
      const result = await run(args, {
        CLOUDFLARE_ACCOUNT_ID: settings.accountId,
      });
      if (result.status !== 0) {
        throw new Error(
          `\`${args.join(" ")}\` exited with ${result.status}: ${(result.stderr || result.stdout).trim().slice(-400)}`,
        );
      }
      return result.stdout;
    },
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    siteStatus: async (url) =>
      (
        await fetch(url, {
          signal: AbortSignal.timeout(20_000),
          redirect: "follow",
        })
      ).status,
  };
}

function readSettings(): Settings {
  const file = path.join(
    homedir(),
    ".config",
    "flare-stack-blog",
    "rehearsal.toml",
  );
  let values: Record<string, string> = {};
  if (existsSync(file)) {
    try {
      values = parseFlatToml(readFileSync(file, "utf8"));
    } catch (error) {
      fail((error as Error).message, 2);
    }
  }
  const resolved = resolveSettings(process.env, values);
  if ("problems" in resolved) {
    fail(
      `settings are missing or wrong:\n  - ${resolved.problems.join("\n  - ")}\nSet them as environment variables or in ${CONFIG_FILE} (key = "value" lines); --help lists the names.`,
      2,
    );
  }
  return resolved.settings;
}

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      interval: { type: "string", default: "15" },
      "max-polls": { type: "string", default: "80" },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(HELP);
    return;
  }
  const interval = Number(values.interval);
  const maxPolls = Number(values["max-polls"]);
  if (!(interval > 0) || !Number.isInteger(maxPolls) || maxPolls < 1) {
    fail(
      "--interval must be a positive number and --max-polls a positive integer",
      2,
    );
  }
  if (positionals.length > 1) fail("at most one commit", 2);

  const settings = readSettings();
  const rev = await run([
    "git",
    "rev-parse",
    "--verify",
    `${positionals[0] ?? "HEAD"}^{commit}`,
  ]);
  if (rev.status !== 0) fail(`not a commit: ${positionals[0] ?? "HEAD"}`, 2);
  const sha = rev.stdout.trim();

  if (values["dry-run"]) {
    console.log(`Would push:   ${pushArgs(settings, sha).join(" ")}`);
    console.log(
      `Would check:  gh api ${refApiPath(settings)}  (expects ${sha})`,
    );
    console.log(
      `Would build:  ${cfBuildsCreateArgs(settings).join(" ")}  (CLOUDFLARE_ACCOUNT_ID set from the settings)`,
    );
    console.log(
      `Would poll:   up to ${maxPolls} times, ${interval} s apart, then GET ${settings.siteUrl}`,
    );
    return;
  }

  try {
    await rehearse(settings, sha, realDeps(settings), {
      intervalMs: interval * 1000,
      maxPolls,
      maxUnreadable: 3,
      siteAttempts: 4,
    });
  } catch (error) {
    fail((error as Error).message);
  }
  console.log(`\nDone: ${sha.slice(0, 8)} is live on ${settings.siteUrl}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
