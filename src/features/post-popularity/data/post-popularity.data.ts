import { and, isNotNull, sql } from "drizzle-orm";
import type { PublishedPostPopularityRef } from "@/features/post-popularity/post-popularity";
import {
  POST_POPULARITY_KEYS,
  PostPopularitySnapshotSchema,
  PostPopularityStatusRecordSchema,
  type PostPopularitySnapshot,
  type PostPopularityStatusRecord,
} from "@/features/post-popularity/post-popularity.schema";
import type { DB } from "@/lib/db";
import { PostsTable } from "@/lib/db/schema";
import { serializeKey } from "@/features/cache/serialize";

const snapshotPublishedAt = sql<string>`json_extract(${PostsTable.publicSnapshotJson}, '$.publishedAt')`;

export async function listPublishedPosts(
  db: DB,
): Promise<PublishedPostPopularityRef[]> {
  const rows = await db
    .select({
      postId: PostsTable.id,
      publicSlug: PostsTable.publicSlug,
      publishedAt: snapshotPublishedAt,
    })
    .from(PostsTable)
    .where(
      and(
        isNotNull(PostsTable.publicSnapshotJson),
        isNotNull(PostsTable.publicSlug),
      ),
    );

  return rows.flatMap((row) => {
    if (!row.publicSlug) return [];
    const publishedAt = Date.parse(row.publishedAt);
    if (!Number.isFinite(publishedAt)) return [];
    return [{ postId: row.postId, publicSlug: row.publicSlug, publishedAt }];
  });
}

async function readJson<T>(
  env: Env,
  key: readonly (string | number)[],
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
): Promise<T | null> {
  const serializedKey = serializeKey(key);
  try {
    const stored = await env.KV.get(serializedKey, "json");
    if (stored === null || stored === undefined) return null;
    const parsed = schema.safeParse(stored);
    if (parsed.success) return parsed.data ?? null;
    console.error(
      JSON.stringify({
        message: "post popularity KV value is invalid",
        key: serializedKey,
      }),
    );
    return null;
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "post popularity KV read failed",
        key: serializedKey,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return null;
  }
}

async function writeJson(
  env: Env,
  key: readonly (string | number)[],
  value: unknown,
): Promise<void> {
  await env.KV.put(serializeKey(key), JSON.stringify(value));
}

export function readSnapshot(env: Env) {
  return readJson(
    env,
    POST_POPULARITY_KEYS.snapshot,
    PostPopularitySnapshotSchema,
  );
}

export async function writeSnapshot(
  env: Env,
  snapshot: PostPopularitySnapshot,
) {
  await writeJson(
    env,
    POST_POPULARITY_KEYS.snapshot,
    PostPopularitySnapshotSchema.parse(snapshot),
  );
}

export function readStatus(env: Env) {
  return readJson(
    env,
    POST_POPULARITY_KEYS.status,
    PostPopularityStatusRecordSchema,
  );
}

export async function writeStatus(
  env: Env,
  status: PostPopularityStatusRecord,
) {
  await writeJson(
    env,
    POST_POPULARITY_KEYS.status,
    PostPopularityStatusRecordSchema.parse(status),
  );
}
