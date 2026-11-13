/**
 * Signs a throwaway Admin into the local dev server, then removes it again.
 *
 *   bun scripts/dev-admin-session.ts seed           # prints the session cookie value
 *   bun scripts/dev-admin-session.ts cleanup        # lists what cleanup would delete
 *   bun scripts/dev-admin-session.ts cleanup --yes  # deletes the Admin, its session and those Posts
 *   bun scripts/dev-admin-session.ts cleanup --yes --keep 12,13  # spares Posts 12 and 13
 *
 * Sign-up needs a Turnstile token, so `seed` writes the user and session rows
 * straight into the local D1 file and signs the cookie with BETTER_AUTH_SECRET
 * from `.dev.vars`, the way better-auth does. The local database is often a
 * copy of production data, and nothing records who created a Post: cleanup
 * can only offer the Posts created since `seed`, which may include someone
 * else's. It lists them first and deletes only with `--yes`, together with
 * every row whose `post_id` points at them.
 */
import { Database } from "bun:sqlite";
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const D1_DIR = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const STATE_FILE = ".wrangler/dev-admin-session.json";
const USER_ID = "dev-admin-session-user";
const EMAIL = "dev-admin-session@example.test";

interface SeedState {
  database: string;
  sessionId: string;
  lastPostId: number;
  /** Unix seconds, the unit of `posts.created_at`. */
  seededAt: number;
}

/**
 * When the database was last written. A running dev server holds it in WAL
 * mode, where writes land in the `-wal` file and the main file's time stands
 * still, so the newer of the two counts.
 */
function lastWrite(file: string) {
  const wal = `${file}-wal`;
  return Math.max(
    statSync(file).mtimeMs,
    existsSync(wal) ? statSync(wal).mtimeMs : 0,
  );
}

function findDatabase() {
  const candidates = readdirSync(D1_DIR)
    .filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite")
    .map((name) => path.join(D1_DIR, name))
    .filter((file) => {
      const db = new Database(file, { readonly: true });
      try {
        return (
          db.query("select 1 from sqlite_master where name = 'posts'").get() !==
          null
        );
      } finally {
        db.close();
      }
    })
    .sort((a, b) => lastWrite(b) - lastWrite(a));
  if (!candidates[0]) {
    throw new Error(
      `No local D1 database with a posts table in ${D1_DIR}; run the dev server once first.`,
    );
  }
  return candidates[0];
}

function authSecret() {
  const secret = readFileSync(".dev.vars", "utf8").match(
    /^BETTER_AUTH_SECRET\s*=\s*"?([^"\n]+)"?/m,
  )?.[1];
  if (!secret) throw new Error("BETTER_AUTH_SECRET is missing from .dev.vars");
  return secret;
}

async function signCookieValue(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return encodeURIComponent(
    `${value}.${Buffer.from(signature).toString("base64")}`,
  );
}

async function seed() {
  if (existsSync(STATE_FILE)) {
    throw new Error(`${STATE_FILE} exists; run cleanup first.`);
  }
  const database = findDatabase();
  const db = new Database(database);
  const now = Date.now();
  const token = crypto.randomUUID().replaceAll("-", "");
  const sessionId = `dev-admin-session-${now}`;
  const lastPostId =
    (db.query("select max(id) as id from posts").get() as { id: number | null })
      .id ?? 0;

  db.run(
    "insert or ignore into user (id, name, email, email_verified, role, created_at, updated_at) values (?, ?, ?, 1, 'admin', ?, ?)",
    [USER_ID, "Dev Admin Session", EMAIL, now, now],
  );
  db.run(
    "insert into session (id, expires_at, token, created_at, updated_at, user_id) values (?, ?, ?, ?, ?, ?)",
    [sessionId, now + 3_600_000, token, now, now, USER_ID],
  );
  db.close();

  writeFileSync(
    STATE_FILE,
    JSON.stringify({
      database,
      sessionId,
      lastPostId,
      seededAt: Math.floor(now / 1000),
    } satisfies SeedState),
  );
  console.log(await signCookieValue(token, authSecret()));
}

function cleanup(confirmed: boolean, keep: ReadonlySet<number>) {
  if (!existsSync(STATE_FILE)) {
    console.log("Nothing to clean up.");
    return;
  }
  const state = JSON.parse(readFileSync(STATE_FILE, "utf8")) as SeedState;
  const db = new Database(state.database);
  db.run("pragma foreign_keys = on");

  const posts = db
    .query(
      "select id, title, status, created_at from posts where id > ? and created_at >= ? order by id",
    )
    .all(state.lastPostId, state.seededAt ?? 0) as Array<{
    id: number;
    title: string;
    status: string;
    created_at: number;
  }>;
  const doomed = posts.filter((post) => !keep.has(post.id));

  if (!confirmed) {
    console.log("Posts created since seed (cleanup --yes deletes them):");
    for (const post of doomed) {
      const created = new Date(post.created_at * 1000).toISOString();
      console.log(
        `  #${post.id} ${post.status} ${created} ${JSON.stringify(post.title)}`,
      );
    }
    if (doomed.length === 0) console.log("  (none)");
    console.log(
      "Check these are all yours, then run cleanup --yes (add --keep <id,id> to spare any).",
    );
    db.close();
    process.exit(2);
  }

  const ids = doomed.map((post) => post.id);
  const marks = ids.map(() => "?").join(", ");
  const tables = (
    db
      .query("select name from sqlite_master where type = 'table'")
      .all() as Array<{ name: string }>
  ).map((row) => row.name);
  // Counts come from `select count(*)`: bun's `changes` also counts rows that
  // foreign keys and triggers touch, so it overstates what was deleted.
  const removed: Record<string, number | Array<number>> = {};

  db.transaction(() => {
    if (ids.length > 0) {
      for (const table of tables) {
        const columns = db
          .query(`pragma table_info("${table}")`)
          .all() as Array<{ name: string }>;
        if (!columns.some((column) => column.name === "post_id")) continue;
        const count = (
          db
            .query(
              `select count(*) as n from "${table}" where post_id in (${marks})`,
            )
            .get(...ids) as { n: number }
        ).n;
        if (count === 0) continue;
        db.run(`delete from "${table}" where post_id in (${marks})`, ids);
        removed[table] = count;
      }
      db.run(`delete from posts where id in (${marks})`, ids);
    }
    removed.session = db.run("delete from session where user_id = ?", [
      USER_ID,
    ]).changes;
    removed.user = db.run("delete from user where id = ?", [USER_ID]).changes;
  })();
  db.close();

  rmSync(STATE_FILE);
  console.log(JSON.stringify({ posts: ids, ...removed }));
}

const command = process.argv[2];
if (command === "seed") await seed();
else if (command === "cleanup") {
  const keepArg = process.argv[process.argv.indexOf("--keep") + 1];
  const keep = process.argv.includes("--keep")
    ? new Set((keepArg ?? "").split(",").map(Number).filter(Number.isInteger))
    : new Set<number>();
  cleanup(process.argv.includes("--yes"), keep);
} else {
  console.error(
    "Usage: bun scripts/dev-admin-session.ts <seed|cleanup [--yes]>",
  );
  process.exit(1);
}
