import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/** Where the sign-in link of `scripts/dev-admin-session.ts seed` lives. */
export const DEV_ADMIN_SESSION_PATH = "/__dev/admin-session";
export const DEV_ADMIN_SESSION_STATE_FILE = ".wrangler/dev-admin-session.json";

const DEFAULT_LANDING = "/admin";
/** A signed better-auth cookie value: URL-encoded `<token>.<base64 signature>`. */
const COOKIE_VALUE = /^[A-Za-z0-9%._~+=-]+$/;

/**
 * Signs a browser into the throwaway Admin of `bun scripts/dev-admin-session.ts
 * seed`: `GET /__dev/admin-session[?to=/path]` answers 302 to `/admin` (or
 * `to`) with the session cookie set, so a worktree's dev server can be looked
 * at without pasting a cookie into a console.
 *
 * This is a development convenience and nothing else:
 * - The route exists only in `vite dev` (`apply: "serve"`). The Vite dev server
 *   answers it in a middleware that runs before the Worker; the request never
 *   reaches the Worker. Nothing of it is under `src/`, no server code imports
 *   this file, and the production build does not contain the path.
 * - It hands out only a session that `seed` already created in the local
 *   database, and only while `.wrangler/dev-admin-session.json` exists (`cleanup`
 *   deletes it). It answers 404 otherwise.
 * - It reads nothing but that state file.
 * - It answers only a client on this machine: when the connection's remote
 *   address is not loopback (the dev server may be reachable from the network),
 *   it answers 404 and sets no cookie. `X-Forwarded-For` and `Host` are not
 *   consulted.
 */
export function devAdminSessionPlugin(): Plugin {
  let root = process.cwd();
  return {
    name: "dev-admin-session",
    apply: "serve",
    // Runs before the Cloudflare plugin, which sends every request to the Worker.
    enforce: "pre",
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!isSignInPath(req.url)) return next();
        const stateFile = path.resolve(root, DEV_ADMIN_SESSION_STATE_FILE);
        const answer = answerSignIn(
          req.method,
          req.url,
          isLoopbackAddress(req.socket.remoteAddress),
          existsSync(stateFile) ? readFileSync(stateFile, "utf8") : undefined,
        );
        res.writeHead(answer.status, answer.headers);
        res.end(answer.body);
      });
    },
  };
}

/** `127.0.0.0/8`, `::1` and the IPv4-mapped `::ffff:127.x.x.x`; anything else, or no address, is not loopback. */
export function isLoopbackAddress(address: string | undefined) {
  if (address === undefined) return false;
  if (address === "::1") return true;
  const v4 = address.toLowerCase().startsWith("::ffff:")
    ? address.slice("::ffff:".length)
    : address;
  const octets = v4.split(".");
  return (
    octets.length === 4 &&
    octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255) &&
    octets[0] === "127"
  );
}

/** The request's path is the sign-in path, whatever its query. */
export function isSignInPath(url: string | undefined) {
  return (
    url !== undefined &&
    new URL(url, "http://localhost").pathname === DEV_ADMIN_SESSION_PATH
  );
}

/** A backslash or a control character, which browsers treat as part of the target's structure. */
function hasUnsafeCharacter(value: string) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code === 0x5c || code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/** `to` when it is a local path (one leading `/`, no backslash or control character), else the Admin. */
export function landingPath(to: string | null | undefined) {
  if (
    typeof to === "string" &&
    to.startsWith("/") &&
    !to.startsWith("//") &&
    !hasUnsafeCharacter(to)
  ) {
    return to;
  }
  return DEFAULT_LANDING;
}

/**
 * The sign-in link of the dev server that `.dev.vars` (its text) configures:
 * the origin of BETTER_AUTH_URL plus the sign-in path. Undefined when the
 * variable is missing or not a URL.
 */
export function signInLink(devVars: string) {
  const value = /^BETTER_AUTH_URL\s*=\s*"?([^"\s]+)"?/m.exec(devVars)?.[1];
  if (!value) return undefined;
  try {
    return `${new URL(value).origin}${DEV_ADMIN_SESSION_PATH}`;
  } catch {
    return undefined;
  }
}

/** The cookie `better-auth` sets in dev (name and attributes of its defaults over http). */
export function sessionCookieHeader(value: string) {
  return `better-auth.session_token=${value}; Path=/; HttpOnly; SameSite=Lax`;
}

export interface SignInAnswer {
  status: number;
  headers: Record<string, string>;
  body: string;
}

const text = (status: number, body: string): SignInAnswer => ({
  status,
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  },
  body,
});

/**
 * Answers a request for the sign-in path from the text of the state file
 * (undefined when there is none). `loopback` is whether the connection comes
 * from this machine; a client elsewhere gets a 404 and no cookie.
 */
export function answerSignIn(
  method: string | undefined,
  url: string | undefined,
  loopback: boolean,
  stateText: string | undefined,
): SignInAnswer {
  if (!loopback) {
    return text(404, "The sign-in link answers only a client on this machine.");
  }
  if (method !== "GET" && method !== "HEAD") {
    return text(405, "GET only.");
  }
  if (stateText === undefined) {
    return text(
      404,
      "No throwaway Admin: run `bun scripts/dev-admin-session.ts seed` first.",
    );
  }
  let cookie: unknown;
  try {
    cookie = (JSON.parse(stateText) as { cookie?: unknown }).cookie;
  } catch {
    cookie = undefined;
  }
  if (typeof cookie !== "string" || !COOKIE_VALUE.test(cookie)) {
    return text(
      404,
      "The state file holds no session cookie: run `cleanup --yes`, then `seed` again.",
    );
  }
  const to = landingPath(
    new URL(url ?? "/", "http://localhost").searchParams.get("to"),
  );
  return {
    status: 302,
    headers: {
      "Set-Cookie": sessionCookieHeader(cookie),
      Location: to,
      "Cache-Control": "no-store",
    },
    body: "",
  };
}
