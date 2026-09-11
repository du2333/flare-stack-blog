import type { JSONContent } from "@tiptap/react";
import { eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { extractAllImageKeys } from "@/features/posts/utils/content";
import {
  MediaTable,
  PostMediaTable,
  PostsTable,
  type PublicPostSnapshot,
} from "@/lib/db/schema";

export type PostMediaSource = {
  id: number;
  contentJson: JSONContent | null;
  publicSnapshotJson: PublicPostSnapshot | null;
  coverMediaId: number | null;
};

function referencedImageKeys(
  contentJson: JSONContent | null | undefined,
  snapshotContentJson: JSONContent | null | undefined,
) {
  return [
    ...new Set([
      ...extractAllImageKeys(contentJson ?? null),
      ...extractAllImageKeys(snapshotContentJson ?? null),
    ]),
  ];
}

function sameMediaIdSet(existing: Array<number>, next: Set<number>) {
  if (existing.length !== next.size) return false;
  return existing.every((mediaId) => next.has(mediaId));
}

export async function syncPostMedia(db: DB, post: PostMediaSource) {
  const usedKeys = referencedImageKeys(
    post.contentJson,
    post.publicSnapshotJson?.contentJson,
  );
  const snapshotCoverKey = post.publicSnapshotJson?.cover?.key;
  if (snapshotCoverKey) usedKeys.push(snapshotCoverKey);

  const mediaIds = new Set<number>();
  if (post.coverMediaId != null) mediaIds.add(post.coverMediaId);
  if (post.publicSnapshotJson?.cover?.mediaId != null) {
    mediaIds.add(post.publicSnapshotJson.cover.mediaId);
  }

  if (usedKeys.length > 0) {
    const mediaRecords = await db
      .select({ id: MediaTable.id })
      .from(MediaTable)
      .where(inArray(MediaTable.key, usedKeys));
    for (const media of mediaRecords) mediaIds.add(media.id);
  }

  const existing = await db
    .select({ mediaId: PostMediaTable.mediaId })
    .from(PostMediaTable)
    .where(eq(PostMediaTable.postId, post.id));
  const existingIds = existing.map((row) => row.mediaId);
  if (sameMediaIdSet(existingIds, mediaIds)) return;

  const statements: Array<BatchItem<"sqlite">> = [];
  if (existingIds.length > 0) {
    statements.push(
      db.delete(PostMediaTable).where(eq(PostMediaTable.postId, post.id)),
    );
  }
  if (mediaIds.size > 0) {
    statements.push(
      db.insert(PostMediaTable).values(
        [...mediaIds].map((mediaId) => ({
          postId: post.id,
          mediaId,
        })),
      ),
    );
  }
  const [head, ...rest] = statements;
  if (!head) return;
  await db.batch([head, ...rest]);
}

export async function getPostsByMediaKey(db: DB, key: string) {
  const posts = await db
    .select({
      id: PostsTable.id,
      title: PostsTable.title,
      slug: PostsTable.slug,
      status: PostsTable.status,
      coverMediaId: PostsTable.coverMediaId,
      snapshotCoverKey: sql<
        string | null
      >`json_extract(${PostsTable.publicSnapshotJson}, '$.cover.key')`,
      snapshotCoverMediaId: sql<
        number | null
      >`json_extract(${PostsTable.publicSnapshotJson}, '$.cover.mediaId')`,
      mediaId: MediaTable.id,
    })
    .from(PostsTable)
    .innerJoin(PostMediaTable, eq(PostsTable.id, PostMediaTable.postId))
    .innerJoin(MediaTable, eq(MediaTable.id, PostMediaTable.mediaId))
    .where(eq(MediaTable.key, key));

  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    status: post.status,
    isCover:
      post.coverMediaId === post.mediaId ||
      post.snapshotCoverKey === key ||
      (post.snapshotCoverMediaId != null &&
        Number(post.snapshotCoverMediaId) === post.mediaId),
  }));
}

export async function isMediaInUse(db: DB, key: string): Promise<boolean> {
  const result = await db
    .select({ id: PostMediaTable.postId })
    .from(PostMediaTable)
    .innerJoin(MediaTable, eq(MediaTable.id, PostMediaTable.mediaId))
    .where(eq(MediaTable.key, key))
    .limit(1);

  return result.length > 0;
}

export async function getLinkedMediaKeys(
  db: DB,
  keys: Array<string>,
): Promise<Array<string>> {
  if (keys.length === 0) return [];

  const results = await db
    .selectDistinct({ key: MediaTable.key })
    .from(MediaTable)
    .innerJoin(PostMediaTable, eq(MediaTable.id, PostMediaTable.mediaId))
    .where(inArray(MediaTable.key, keys));

  return results.map((r) => r.key);
}
