import type { SQL } from "drizzle-orm";
import { and, count, desc, eq, inArray, lt, or, sql, sum } from "drizzle-orm";
import { containsText } from "@/lib/db/text-match";
import {
  MediaTable,
  MomentImagesTable,
  PostMediaTable,
  PostRevisionMediaTable,
  PostRevisionsTable,
  PostsTable,
  user,
} from "@/lib/db/schema";

export type Media = typeof MediaTable.$inferSelect;

// An Admin's avatar picked from the media library is a reference, like a Post
// image. Other users' avatar URLs are not, so they cannot pin media.
const usedAsAdminAvatar = sql`exists (select 1 from ${user} where ${user.role} = 'admin' and instr(${user.image}, '/images/' || ${MediaTable.key}) > 0)`;

// A Post Revision's images count too, so restoring it never brings back a
// deleted image, and so do a Moment's.
const unreferenced = sql`not exists (select 1 from ${PostMediaTable} where ${PostMediaTable.mediaId} = ${MediaTable.id}) and not exists (select 1 from ${PostRevisionMediaTable} where ${PostRevisionMediaTable.mediaId} = ${MediaTable.id}) and not exists (select 1 from ${MomentImagesTable} where ${MomentImagesTable.mediaId} = ${MediaTable.id}) and not ${usedAsAdminAvatar}`;

export type MediaListItem = Media & {
  postCount: number;
  revisionOnlyPostCount: number;
  momentCount: number;
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

/**
 * Deletes the Media with `key` unless something uses it: a Post (draft,
 * Public Content Snapshot or cover), a Post Revision, a Moment or an Admin's
 * avatar. The check and the delete are one statement, so a Post or Moment
 * write that records the Media in the meantime (`mediaReferenceGuards`,
 * `moments.data.ts`) makes it refuse. Returns whether it deleted.
 */
export async function deleteMediaIfUnused(db: DB, key: string) {
  const deleted = await db
    .delete(MediaTable)
    .where(and(eq(MediaTable.key, key), unreferenced))
    .returning({ id: MediaTable.id });
  return deleted.length > 0;
}

/** Returns false when no Media has `key`. */
export async function updateMediaName(db: DB, key: string, name: string) {
  const renamed = await db
    .update(MediaTable)
    .set({ fileName: name })
    .where(eq(MediaTable.key, key))
    .returning({ id: MediaTable.id });
  return renamed.length > 0;
}

export async function updateMediaFile(
  db: DB,
  key: string,
  data: {
    url: string;
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
      url: data.url,
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
    conditions.push(containsText(MediaTable.fileName, search));
  }

  if (unusedOnly) {
    conditions.push(unreferenced);
  }

  const items: Array<Media> = await db
    .select()
    .from(MediaTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(MediaTable.id))
    .limit(limit + 1);

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
    .where(unreferenced);
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
    .where(unreferenced);

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

const snapshotCoverMediaId = sql<
  number | null
>`json_extract(${PostsTable.publicSnapshotJson}, '$.cover.mediaId')`;

async function withUsage(
  db: DB,
  items: Array<Media>,
): Promise<Array<MediaListItem>> {
  if (items.length === 0) return [];

  const ids = items.map((item) => item.id);
  const [postRows, revisionRows, coverRows, momentRows] = await Promise.all([
    db
      .select({
        mediaId: PostMediaTable.mediaId,
        postId: PostMediaTable.postId,
      })
      .from(PostMediaTable)
      .where(inArray(PostMediaTable.mediaId, ids)),
    db
      .selectDistinct({
        mediaId: PostRevisionMediaTable.mediaId,
        postId: PostRevisionsTable.postId,
      })
      .from(PostRevisionMediaTable)
      .innerJoin(
        PostRevisionsTable,
        eq(PostRevisionsTable.id, PostRevisionMediaTable.revisionId),
      )
      .where(inArray(PostRevisionMediaTable.mediaId, ids)),
    db
      .select({
        coverMediaId: PostsTable.coverMediaId,
        snapshotCoverMediaId,
      })
      .from(PostsTable)
      .where(
        or(
          inArray(PostsTable.coverMediaId, ids),
          inArray(snapshotCoverMediaId, ids),
        ),
      ),
    db
      .select({
        mediaId: MomentImagesTable.mediaId,
        momentCount: sql<number>`count(distinct ${MomentImagesTable.momentId})`,
      })
      .from(MomentImagesTable)
      .where(inArray(MomentImagesTable.mediaId, ids))
      .groupBy(MomentImagesTable.mediaId),
  ]);
  const momentCounts = new Map(
    momentRows.map((row) => [row.mediaId, Number(row.momentCount)]),
  );

  const groupByMedia = (rows: Array<{ mediaId: number; postId: number }>) => {
    const postIdsById = new Map<number, Set<number>>();
    for (const row of rows) {
      const postIds = postIdsById.get(row.mediaId) ?? new Set<number>();
      postIds.add(row.postId);
      postIdsById.set(row.mediaId, postIds);
    }
    return postIdsById;
  };
  const currentPostIds = groupByMedia(postRows);
  const revisionPostIds = groupByMedia(revisionRows);
  const coverIds = new Set<number>();
  for (const row of coverRows) {
    if (row.coverMediaId != null) coverIds.add(row.coverMediaId);
    if (row.snapshotCoverMediaId != null) {
      coverIds.add(Number(row.snapshotCoverMediaId));
    }
  }

  return items.map((item) => ({
    ...item,
    postCount: currentPostIds.get(item.id)?.size ?? 0,
    // A post that also uses the image in its draft or published version is
    // already in postCount.
    revisionOnlyPostCount: [...(revisionPostIds.get(item.id) ?? [])].filter(
      (postId) => !currentPostIds.get(item.id)?.has(postId),
    ).length,
    momentCount: momentCounts.get(item.id) ?? 0,
    isCover: coverIds.has(item.id),
  }));
}

export async function deleteUnusedMedia(db: DB): Promise<Array<string>> {
  const rows = await db
    .delete(MediaTable)
    .where(unreferenced)
    .returning({ key: MediaTable.key });
  return rows.map((row) => row.key);
}
