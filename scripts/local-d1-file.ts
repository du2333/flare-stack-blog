import { createHash, createHmac } from "node:crypto";

/**
 * Which file under `.wrangler/state/v3/d1/miniflare-D1DatabaseObject` is the
 * local database of the configured D1 id. The Cloudflare Vite plugin runs each
 * D1 database as a Durable Object of Miniflare, and workerd stores a named
 * object in a file named after its id: 32 bytes, the first half
 * `HMAC-SHA256(SHA256(unique key), name)`, the second half the same HMAC of
 * the first half (both cut to 16 bytes). The unique key is the plugin's
 * `miniflare-D1DatabaseObject`, the name the database id.
 */
const D1_UNIQUE_KEY = "miniflare-D1DatabaseObject";

/** The id `cloudflare.config.ts` falls back to; a test keeps the two equal. */
export const PLACEHOLDER_D1_ID = "00000000-0000-4000-8000-000000000000";

/** The D1 id `cloudflare.config.ts` binds: `D1_DATABASE_ID` or its placeholder. */
export function configuredD1Id(env: Record<string, string | undefined>) {
  return env.D1_DATABASE_ID?.trim() || PLACEHOLDER_D1_ID;
}

export function d1FileName(databaseId: string) {
  const key = createHash("sha256").update(D1_UNIQUE_KEY).digest();
  const first = createHmac("sha256", key)
    .update(databaseId)
    .digest()
    .subarray(0, 16);
  const second = createHmac("sha256", key)
    .update(first)
    .digest()
    .subarray(0, 16);
  return `${Buffer.concat([first, second]).toString("hex")}.sqlite`;
}

/** One `.sqlite` file of the D1 state directory, as `chooseDatabase` weighs it. */
export interface DatabaseFile {
  name: string;
  hasPosts: boolean;
  /** Milliseconds; the newer of the file and its `-wal`. */
  lastWrite: number;
}

/**
 * The file the dev server uses: the one named after the configured D1 id. A
 * state directory can hold several copies (sample data, earlier setups), and
 * picking one by its content once gave an empty database. Only when that file
 * is not there (the server never ran) the choice falls back to the file with a
 * `posts` table that was written last. `why` says which rule chose.
 */
export function chooseDatabase(files: Array<DatabaseFile>, databaseId: string) {
  const expected = d1FileName(databaseId);
  const own = files.find((file) => file.name === expected);
  if (own) {
    if (!own.hasPosts) {
      throw new Error(
        `${expected} is the dev server's database but has no posts table; run bun run db:migrate:local.`,
      );
    }
    return { name: own.name, why: "the configured D1 id" };
  }
  const newest = files
    .filter((file) => file.hasPosts)
    .sort((a, b) => b.lastWrite - a.lastWrite)[0];
  if (!newest) {
    throw new Error(
      "No local D1 database with a posts table; run the dev server once first.",
    );
  }
  return {
    name: newest.name,
    why: `${expected} does not exist; the most recently written file with a posts table`,
  };
}
