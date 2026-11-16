/**
 * The session `bun scripts/dev-admin-session.ts seed` wrote down, so a run
 * does not take the cookie on its command line (where logs and transcripts
 * keep it). Read from the current directory's `.wrangler`, the checkout that
 * seeded; a server of another worktree needs `--session`.
 */
import { readFileSync } from "node:fs";

const STATE_FILE = ".wrangler/dev-admin-session.json";

/** The cookie value of the seeded throwaway Admin, or undefined when there is none. */
export function readSeededSession(): string | undefined {
  try {
    const { cookie } = JSON.parse(readFileSync(STATE_FILE, "utf8")) as {
      cookie?: unknown;
    };
    return typeof cookie === "string" && cookie ? cookie : undefined;
  } catch {
    return undefined;
  }
}

/** Only a local server can know the throwaway Admin; a remote site never gets its cookie. */
export const isLocalHost = (base: URL) =>
  /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/.test(base.hostname);

/** The line a run prints when it needs a session and has none. */
export const NO_SESSION =
  "no session: run `bun scripts/dev-admin-session.ts seed` in this checkout (or pass --session <cookie>)";
