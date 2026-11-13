/**
 * The local dev server's database, for the flows that must change a row the
 * app cannot (blank a name) and for putting back a session a flow ended. It is
 * the file `scripts/dev-admin-session.ts seed` chose and wrote down, so it is
 * the file the dev server uses, and only for the throwaway Admin that script
 * makes.
 */
import { Database } from "bun:sqlite";
import { existsSync, readFileSync } from "node:fs";

const STATE_FILE = ".wrangler/dev-admin-session.json";
export const THROWAWAY_ADMIN_ID = "dev-admin-session-user";

export interface LocalDb {
  get<T>(sql: string, ...params: Array<unknown>): T | undefined;
  run(sql: string, ...params: Array<unknown>): void;
  close(): void;
}

/** The database `seed` chose, or undefined when there is no seeded Admin. */
export function openLocalDb(): LocalDb | undefined {
  if (!existsSync(STATE_FILE)) return undefined;
  const { database } = JSON.parse(readFileSync(STATE_FILE, "utf8")) as {
    database?: string;
  };
  if (!database || !existsSync(database)) return undefined;
  const db = new Database(database);
  return {
    get: <T>(sql: string, ...params: Array<unknown>) =>
      (db.query(sql).get(...params) as T | null) ?? undefined,
    run: (sql, ...params) => void db.run(sql, params),
    close: () => db.close(),
  };
}

/** The token inside a signed session cookie value (`<token>.<signature>`, URL-encoded). */
export function tokenOf(cookie: string) {
  const value = decodeURIComponent(cookie);
  return value.slice(0, value.lastIndexOf("."));
}

type Row = Record<string, unknown>;

/**
 * A logout deletes the session row, and the next flow would find itself
 * signed out. Remembers the row of the cookie's session; `restore` puts it
 * back (valid for another hour) when a flow removed it.
 */
export function guardSession(db: LocalDb, cookie: string) {
  const token = tokenOf(cookie);
  const saved = db.get<Row>("select * from session where token = ?", token);
  return {
    restore() {
      if (!saved || db.get("select 1 from session where token = ?", token)) {
        return;
      }
      const row = { ...saved, expires_at: Date.now() + 3_600_000 };
      const columns = Object.keys(row);
      db.run(
        `insert into session (${columns.join(", ")}) values (${columns.map(() => "?").join(", ")})`,
        ...Object.values(row),
      );
    },
  };
}
