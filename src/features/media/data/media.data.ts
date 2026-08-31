import type { SQL } from "drizzle-orm";
import { and, count, desc, eq, inArray, lt, or, sql, sum } from "drizzle-orm";
import { escapeLikeString } from "@/features/media/data/helper";
import { MediaTable, PostMediaTable, PostsTable } from "@/lib/db/schema";

export type Media = typeof MediaTable.$inferSelect;
export type MediaListItem = Media & {
  postCount: number;
  isCover: boolean;
};

export async function insertMedia(
  db: DB,
  data: typeof MediaTable.$inferInsert,
): Promise<Media> {
  const [inserted] = await db.insert(MediaTable).values(data).returning();
  return inserted;
}

export async function findMediaById(db: DB, id: number): Promise<Media | null> {
  const [media] = await db
    .select()
    .from(MediaTable)
    .where(eq(MediaTable.id, id))
    .limit(1);
  return media ?? null;
}

export async function findMediaByKey(
  db: DB,
  key: string,
): Promise<Media | null> {
  const [media] = await db
    .select()
    .from(MediaTable)
    .where(eq(MediaTable.key, key))
    .limit(1);
  return media ?? null;
}

export async function deleteMedia(db: DB, key: string) {
  await db.delete(MediaTable).where(eq(MediaTable.key, key));
}

export async function updateMediaName(db: DB, key: string, name: string) {
  await db
    .update(MediaTable)
    .set({ fileName: name })
    .where(eq(MediaTable.key, key));
}

export async function updateMediaFile(
  db: DB,
  key: string,
  data: {
    fileName: string;
    mimeType: string;
    sizeInBytes: number;
    width: number | null | undefined;
    height: number | null | undefined;
  },
): Promise<Media | null> {
  const [updated] = await db
    .update(MediaTable)
    .set({
      fileName: data.fileName,
      mimeType: data.mimeType,
      sizeInBytes: data.sizeInBytes,
      width: data.width ?? null,
      height: data.height ?? null,
    })
    .where(eq(MediaTable.key, key))
    .returning();
  return updated ?? null;
}

const DEFAULT_PAGE_SIZE = 20;

export async function getMediaList(
  db: DB,
  options?: {
    cursor?: number;
    limit?: number;
    search?: string;
    unusedOnly?: boolean;
  },
): Promise<{ items: Array<MediaListItem>; nextCursor: number | null }> {
  const {
    cursor,
    limit = DEFAULT_PAGE_SIZE,
    search,
    unusedOnly,
  } = options ?? {};

  const conditions: Array<SQL> = [];
  if (cursor) {
    conditions.push(lt(MediaTable.id, cursor));
  }
  if (search) {
    const pattern = `%${escapeLikeString(search)}%`;
    conditions.push(sql`${MediaTable.fileName} LIKE ${pattern} ESCAPE '\\'`);
  }

  let items: Array<Media>;

  if (unusedOnly) {
    conditions.push(sql`${PostMediaTable.postId} IS NULL`);
    items = await db
      .select({
        media: MediaTable,
        postMediaId: PostMediaTable.postId,
      })
      .from(MediaTable)
      .leftJoin(PostMediaTable, eq(MediaTable.id, PostMediaTable.mediaId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(MediaTable.id))
      .limit(limit + 1)
      .then((rows) => rows.map((row) => row.media));
  } else {
    items = await db
      .select()
      .from(MediaTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(MediaTable.id))
      .limit(limit + 1);
  }

  const hasMore = items.length > limit;
  if (hasMore) {
    items.pop();
  }

  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

  return { items: await withUsage(db, items), nextCursor };
}

export async function getUnusedMediaKeys(db: DB): Promise<Array<string>> {
  const rows = await db
    .select({ key: MediaTable.key })
    .from(MediaTable)
    .leftJoin(PostMediaTable, eq(MediaTable.id, PostMediaTable.mediaId))
    .where(sql`${PostMediaTable.postId} IS NULL`);
  return rows.map((row) => row.key);
}

export async function getMediaStats(db: DB) {
  const [totals] = await db
    .select({
      totalCount: count(),
      totalBytes: sum(MediaTable.sizeInBytes),
    })
    .from(MediaTable);

  const [unused] = await db
    .select({ unusedCount: count() })
    .from(MediaTable)
    .leftJoin(PostMediaTable, eq(MediaTable.id, PostMediaTable.mediaId))
    .where(sql`${PostMediaTable.postId} IS NULL`);

  return {
    totalCount: Number(totals.totalCount ?? 0),
    unusedCount: Number(unused.unusedCount ?? 0),
    totalBytes: Number(totals.totalBytes ?? 0),
  };
}

export async function getTotalMediaSize(db: DB) {
  const stats = await getMediaStats(db);
  return stats.totalBytes;
}

async function withUsage(
  db: DB,
  items: Array<Media>,
): Promise<Array<MediaListItem>> {
  if (items.length === 0) return [];

  const ids = items.map((item) => item.id);
  const [countRows, coverRows] = await Promise.all([
    db
      .select({
        mediaId: PostMediaTable.mediaId,
        postCount: count(),
      })
      .from(PostMediaTable)
      .where(inArray(PostMediaTable.mediaId, ids))
      .groupBy(PostMediaTable.mediaId),
    db
      .select({
        coverMediaId: PostsTable.coverMediaId,
        snapshot: PostsTable.publicSnapshotJson,
      })
      .from(PostsTable)
      .where(
        or(
          inArray(PostsTable.coverMediaId, ids),
          sql`json_extract(${PostsTable.publicSnapshotJson}, '$.cover.mediaId') is not null`,
        ),
      ),
  ]);

  const postCountById = new Map(
    countRows.map((row) => [row.mediaId, Number(row.postCount)]),
  );
  const coverIds = new Set<number>();
  for (const row of coverRows) {
    if (row.coverMediaId != null) coverIds.add(row.coverMediaId);
    const snapshotId = row.snapshot?.cover?.mediaId;
    if (snapshotId != null) coverIds.add(snapshotId);
  }

  return items.map((item) => ({
    ...item,
    postCount: postCountById.get(item.id) ?? 0,
    isCover: coverIds.has(item.id),
  }));
}
