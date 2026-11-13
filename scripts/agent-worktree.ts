/**
 * Prepares the current git worktree for running the app on its own port:
 *
 *   bun run worktree:setup --port 3506
 *
 * Installs dependencies (through scripts/heavy.sh) and fails when that left a
 * nested copy of a package that must be single (check-single-packages.ts),
 * copies the sample data from
 * `<git common dir>/sample-data/.wrangler` into `./.wrangler`, and writes
 * `./.dev.vars` from the main checkout's with BETTER_AUTH_URL for that port.
 * It reads the main checkout and never writes there.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { checkSinglePackages } from "./check-single-packages.ts";

/** `.dev.vars` content with BETTER_AUTH_URL pointing at the local port. */
export function withAuthUrl(content: string, port: number) {
  const line = `BETTER_AUTH_URL=http://localhost:${port}`;
  if (/^BETTER_AUTH_URL=.*$/m.test(content)) {
    return content.replace(/^BETTER_AUTH_URL=.*$/m, line);
  }
  return `${content}${content === "" || content.endsWith("\n") ? "" : "\n"}${line}\n`;
}

/** The first `worktree` entry of `git worktree list --porcelain` is the main checkout. */
export function mainCheckoutOf(porcelain: string) {
  const first = porcelain
    .split("\n")
    .find((line) => line.startsWith("worktree "));
  return first ? first.slice("worktree ".length) : undefined;
}

function git(...args: Array<string>) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")}: ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

function fail(message: string): never {
  console.error(`worktree:setup: ${message}`);
  process.exit(1);
}

function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: { port: { type: "string" } },
  });
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    fail("usage: bun run worktree:setup --port <1024-65535>");
  }
  if (port === 3000) {
    fail("port 3000 belongs to the main checkout's dev server; pick another");
  }

  const here = git("rev-parse", "--show-toplevel");
  const mainDir = mainCheckoutOf(git("worktree", "list", "--porcelain"));
  if (!mainDir) fail("cannot find the main checkout");
  if (path.resolve(here) === path.resolve(mainDir)) {
    fail(
      `this is the main checkout (${mainDir}); run it inside a git worktree`,
    );
  }

  const common = git("rev-parse", "--path-format=absolute", "--git-common-dir");
  const sample = path.join(common, "sample-data", ".wrangler");
  if (!existsSync(sample) && !existsSync(path.join(here, ".wrangler"))) {
    fail(`sample data missing: expected ${sample}`);
  }
  const mainVars = path.join(mainDir, ".dev.vars");
  if (!existsSync(mainVars)) fail(`${mainVars} is missing`);

  const install = spawnSync(
    path.join(here, "scripts", "heavy.sh"),
    ["bun", "install"],
    { cwd: here, stdio: "inherit" },
  );
  if (install.status !== 0) fail("bun install failed");

  // A second router in node_modules installs without a word and only shows as
  // hundreds of tsc errors later.
  const duplicates = checkSinglePackages(path.join(here, "node_modules"));
  if (duplicates) fail(duplicates);

  if (existsSync(path.join(here, ".wrangler"))) {
    console.log(".wrangler already here, kept as it is");
  } else {
    cpSync(sample, path.join(here, ".wrangler"), { recursive: true });
    console.log("copied the sample data to .wrangler");
  }

  writeFileSync(
    path.join(here, ".dev.vars"),
    withAuthUrl(readFileSync(mainVars, "utf8"), port),
    { mode: 0o600 },
  );
  console.log(`wrote .dev.vars (BETTER_AUTH_URL=http://localhost:${port})`);

  console.log(`
Start the server:   bunx vite dev --port ${port} --strictPort
When you are done:  stop that server (lsof -ti:${port} -sTCP:LISTEN | xargs -r kill), then run bun scripts/dev-admin-session.ts cleanup --yes`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
