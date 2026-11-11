/**
 * Checks on a production build that a page links only the selected Theme's
 * stylesheet (docs/theme-shell-checklist.md). Not part of `bun run check`.
 *
 *   bun scripts/check-theme-styles.ts             # builds with THEME_FIXTURE=1 first
 *   bun scripts/check-theme-styles.ts --no-build  # reuses that build
 *
 * The build includes the test fixture Theme (scripts/vite-theme-fixture.ts).
 * The script serves it with `vite preview` on port 3100 against the local
 * database, signs in the throwaway Admin (scripts/dev-admin-session.ts),
 * selects each Theme through the Admin API the way the Site Config page saves
 * it, and reads the server-rendered HTML of `/` and `/admin` with plain HTTP
 * requests: `/` must link the selected Theme's stylesheet and no other's and
 * carry its `data-theme`; `/admin` neither. Each request comes after a save,
 * which purges the cached public pages, so it also shows that a switch needs
 * no rebuild. Then, with the default Theme saved, it previews the fixture
 * Theme as the Admin and checks that the preview is rendered only for the
 * Admin, is never cacheable, and leaves the next anonymous visit on the saved
 * Theme. The Theme that was selected before is saved back at the end.
 *
 * Needs a `.dev.vars` (see .dev.vars.example) whose DOMAIN is a domain name,
 * not localhost, and BETTER_AUTH_URL=http://localhost:3100.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { FIXTURE_THEME_ID } from "../tests/theme-fixture/theme-id.ts";
import { BUILT_IN_THEME_IDS } from "../src/features/theme/theme-ids.ts";
import { themePreviewHref } from "../src/features/theme/utils/theme-preview-params.ts";

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const THEME_IDS = [...BUILT_IN_THEME_IDS, FIXTURE_THEME_ID];

function run(command: string, args: Array<string>, env = {}) {
  const result = spawnSync(command, args, {
    stdio: ["ignore", "pipe", "inherit"],
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited ${result.status}`);
  }
  return result.stdout.toString();
}

async function isServing() {
  try {
    await fetch(BASE, { signal: AbortSignal.timeout(2_000) });
    return true;
  } catch {
    return false;
  }
}

function attribute(tag: string, name: string) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
}

/** The `data-theme` of `<html>` and the stylesheets the page links. */
async function readPage(path: string, cookie?: string) {
  const response = await fetch(BASE + path, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });
  if (response.status !== 200) {
    throw new Error(`GET ${path} answered ${response.status}`);
  }
  const html = await response.text();
  const htmlTag = /<html[^>]*>/.exec(html)?.[0] ?? "";
  const hrefs = [...html.matchAll(/<link[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => attribute(tag, "rel") === "stylesheet")
    .map((tag) => attribute(tag, "href")!);
  return {
    dataTheme: attribute(htmlTag, "data-theme"),
    hrefs,
    cacheControl: response.headers.get("Cache-Control"),
    cacheTag: response.headers.get("Cache-Tag"),
  };
}

/** Which Themes' stylesheets are among these: each scopes its root rule to its id. */
async function themesLinked(hrefs: Array<string>) {
  const sheets = await Promise.all(
    hrefs.map(async (href) => (await fetch(BASE + href)).text()),
  );
  return THEME_IDS.filter((id) =>
    sheets.some((css) =>
      new RegExp(`:root\\[data-theme="?${id}"?\\]`).test(css),
    ),
  );
}

const failures: Array<string> = [];
function expectEqual(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(
    `${ok ? "ok  " : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`,
  );
  if (!ok) failures.push(label);
}

if (!existsSync(".dev.vars")) {
  throw new Error(".dev.vars is missing; copy .dev.vars.example.");
}
if (await isServing()) {
  throw new Error(`Port ${PORT} is in use; stop what serves it first.`);
}
if (!process.argv.includes("--no-build")) {
  console.log("Building with the fixture Theme…");
  const build = spawnSync("bun", ["run", "build"], {
    stdio: "inherit",
    env: { ...process.env, THEME_FIXTURE: "1" },
  });
  if (build.status !== 0) throw new Error("The build failed.");
}
run("bun", ["run", "db:migrate:local"]);

const preview = spawn(
  "bunx",
  ["vite", "preview", "--port", String(PORT), "--strictPort"],
  {
    stdio: "ignore",
    detached: true,
    env: { ...process.env, CLOUDFLARE_VITE_FORCE_BUILD_OUTPUT: "true" },
  },
);
let seeded = false;
let restore: (() => Promise<void>) | undefined;
try {
  const startedAt = Date.now();
  while (!(await isServing())) {
    if (Date.now() - startedAt > 60_000 || preview.exitCode !== null) {
      throw new Error("vite preview did not start");
    }
    await sleep(500);
  }

  const cookie = `better-auth.session_token=${run("bun", ["scripts/dev-admin-session.ts", "seed"]).trim()}`;
  seeded = true;
  const api = async (method: string, body?: unknown) => {
    const response = await fetch(`${BASE}/api/admin/config`, {
      method,
      headers: {
        Cookie: cookie,
        Origin: BASE,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(
        `${method} /api/admin/config answered ${response.status}: ${await response.text()}`,
      );
    }
    return (await response.json()) as {
      config: { site: { theme: { id: string } } & Record<string, unknown> };
      revisions: { site: unknown };
    };
  };
  const select = async (id: string) => {
    const { config, revisions } = await api("GET");
    await api("PATCH", {
      section: "site",
      expectedRevision: revisions.site,
      site: { ...config.site, theme: { ...config.site.theme, id } },
    });
  };
  const original = (await api("GET")).config.site.theme.id;
  restore = () => select(original);

  // The fixture first, so the check ends on the default Theme.
  for (const id of [FIXTURE_THEME_ID, ...BUILT_IN_THEME_IDS]) {
    await select(id);
    const home = await readPage("/");
    expectEqual(`/ with ${id}: data-theme`, home.dataTheme, id);
    expectEqual(
      `/ with ${id}: Theme stylesheets linked`,
      await themesLinked(home.hrefs),
      [id],
    );
    const admin = await readPage("/admin", cookie);
    expectEqual(`/admin with ${id}: data-theme`, admin.dataTheme, undefined);
    expectEqual(
      `/admin with ${id}: Theme stylesheets linked`,
      await themesLinked(admin.hrefs),
      [],
    );
  }

  // The loop ended on the default Theme. Fill its cache entries first, so a
  // preview stored under their keys would show below.
  const [saved] = BUILT_IN_THEME_IDS;
  const previewPath = themePreviewHref(FIXTURE_THEME_ID, { marker: "off" });
  const postsPreviewPath = `/posts${previewPath.slice(1)}`;
  await readPage("/");
  await readPage("/posts");
  for (const [path, who, cookieHeader] of [
    [previewPath, "the Admin", cookie],
    [postsPreviewPath, "the Admin", cookie],
    [previewPath, "an unknown session", "better-auth.session_token=invalid"],
  ] as const) {
    const page = await readPage(path, cookieHeader);
    const expected = who === "the Admin" ? FIXTURE_THEME_ID : saved;
    expectEqual(`${path} as ${who}: data-theme`, page.dataTheme, expected);
    expectEqual(
      `${path} as ${who}: Theme stylesheets linked`,
      await themesLinked(page.hrefs),
      [expected],
    );
    expectEqual(
      `${path} as ${who}: private`,
      page.cacheControl?.startsWith("private, no-store"),
      true,
    );
    expectEqual(`${path} as ${who}: Cache-Tag`, page.cacheTag, null);
  }
  for (const path of ["/", "/posts", previewPath]) {
    const page = await readPage(path);
    expectEqual(`${path} anonymously after the preview`, page.dataTheme, saved);
    expectEqual(
      `${path} anonymously after the preview: Theme stylesheets linked`,
      await themesLinked(page.hrefs),
      [saved],
    );
  }
} finally {
  await restore?.().catch((error) => {
    console.error(`Could not select the original Theme again: ${error}`);
  });
  if (seeded) {
    // Keep every Post the session listing offers: this check creates none.
    const listing = spawnSync("bun", [
      "scripts/dev-admin-session.ts",
      "cleanup",
    ]);
    const keep = [...listing.stdout.toString().matchAll(/#(\d+)/g)].map(
      ([, id]) => id,
    );
    run("bun", [
      "scripts/dev-admin-session.ts",
      "cleanup",
      "--yes",
      "--keep",
      keep.join(","),
    ]);
  }
  if (preview.pid !== undefined) {
    try {
      process.kill(-preview.pid, "SIGTERM");
    } catch {
      preview.kill("SIGTERM");
    }
  }
}

if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log("Every page linked only the selected Theme's stylesheet.");
