import type { JSONContent } from "@tiptap/react";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { extractAllImageKeys } from "@/features/posts/utils/content";
import {
  MediaTable,
  MomentImagesTable,
  PostMediaTable,
  PostRevisionMediaTable,
  PostRevisionsTable,
  PostsTable,
  type PublicPostSnapshot,
} from "@/lib/db/schema";

export type PostMediaSource = {
  id: number;
  saveToken: string;
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

/**
 * Sets the Media the Post uses (`post_media`) to what `post`, as read, refers
 * to. It writes only while the Post still carries the saveToken of that read:
 * a write landing since then syncs after it, and a sync from an older read
 * must not drop what that write added. Adding never waits for a sync: a save
 * records the Media its body adds in the same batch (`mediaReferenceGuards`),
 * so a sync only ever removes what is no longer used.
 */
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

  const readCurrent = sql`EXISTS (SELECT 1 FROM ${PostsTable} WHERE ${PostsTable.id} = ${post.id} AND ${PostsTable.saveToken} = ${post.saveToken})`;
  const statements: Array<BatchItem<"sqlite">> = [];
  if (existingIds.length > 0) {
    statements.push(
      db
        .delete(PostMediaTable)
        .where(and(eq(PostMediaTable.postId, post.id), readCurrent)),
    );
  }
  if (mediaIds.size > 0) {
    // From `media`, so an item deleted since it was looked up is left out
    // instead of failing the foreign key.
    statements.push(
      db
        .insert(PostMediaTable)
        .select(
          sql`SELECT ${post.id}, ${MediaTable.id} FROM ${MediaTable} WHERE ${inArray(MediaTable.id, [...mediaIds])} AND ${readCurrent}`,
        ),
    );
  }
  const [head, ...rest] = statements;
  if (!head) return;
  await db.batch([head, ...rest]);
}

/**
 * Which of `keys` no Media has.
 */
export async function findMissingMediaKeys(db: DB, keys: Array<string>) {
  const unique = [...new Set(keys)];
  if (unique.length === 0) return [];
  const found = await db
    .select({ key: MediaTable.key })
    .from(MediaTable)
    .where(inArray(MediaTable.key, unique));
  const existing = new Set(found.map((media) => media.key));
  return unique.filter((key) => !existing.has(key));
}

/**
 * Statements, for the batch that writes a Post, that record the Post as
 * using the Media with `keys` and `mediaIds`. They apply once the Post
 * (`postId`, when the write knows it) carries `saveToken`, the token that
 * write sets, and each one fails the
 * whole batch with a NOT NULL constraint failure on `post_media.media_id`
 * (see `isMediaGone`) if its Media no longer exists. Deleting Media is one
 * statement that refuses Media in `post_media`, so either the write commits
 * first and the delete refuses, or the delete commits first and the write
 * fails: no Post is left referring to deleted Media.
 */
export function mediaReferenceGuards(
  db: DB,
  written: { postId?: number; saveToken: string },
  refs: { keys: Array<string>; mediaIds: Array<number> },
): Array<BatchItem<"sqlite">> {
  const post = sql`(SELECT ${PostsTable.id} FROM ${PostsTable} WHERE ${
    written.postId === undefined
      ? sql`true`
      : sql`${PostsTable.id} = ${written.postId}`
  } AND ${PostsTable.saveToken} = ${written.saveToken})`;
  const media = [
    ...[...new Set(refs.keys)].map(
      (key) =>
        sql`(SELECT ${MediaTable.id} FROM ${MediaTable} WHERE ${MediaTable.key} = ${key})`,
    ),
    ...[...new Set(refs.mediaIds)].map(
      (id) =>
        sql`(SELECT ${MediaTable.id} FROM ${MediaTable} WHERE ${MediaTable.id} = ${id})`,
    ),
  ];
  return media.map((mediaId) =>
    db
      .insert(PostMediaTable)
      .select(sql`SELECT ${post}, ${mediaId} WHERE ${post} IS NOT NULL`)
      .onConflictDoNothing(),
  );
}

/** Whether a batch failed because Media a guard records was deleted. */
export function isMediaGone(error: unknown) {
  for (let current = error; current instanceof Error; current = current.cause) {
    if (
      /NOT NULL constraint failed:\s*post_media\.media_id/i.test(
        current.message,
      )
    ) {
      return true;
    }
  }
  return false;
}

export async function getPostsByMediaKey(db: DB, key: string) {
  const [posts, revisionPosts] = await Promise.all([
    db
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
      .where(eq(MediaTable.key, key)),
    db
      .selectDistinct({
        id: PostsTable.id,
        title: PostsTable.title,
        slug: PostsTable.slug,
        status: PostsTable.status,
      })
      .from(PostRevisionMediaTable)
      .innerJoin(MediaTable, eq(MediaTable.id, PostRevisionMediaTable.mediaId))
      .innerJoin(
        PostRevisionsTable,
        eq(PostRevisionsTable.id, PostRevisionMediaTable.revisionId),
      )
      .innerJoin(PostsTable, eq(PostsTable.id, PostRevisionsTable.postId))
      .where(eq(MediaTable.key, key)),
  ]);

  const linked = posts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    status: post.status,
    isCover:
      post.coverMediaId === post.mediaId ||
      post.snapshotCoverKey === key ||
      (post.snapshotCoverMediaId != null &&
        Number(post.snapshotCoverMediaId) === post.mediaId),
    revisionsOnly: false,
  }));
  const listed = new Set(linked.map((post) => post.id));
  for (const post of revisionPosts) {
    if (listed.has(post.id)) continue;
    linked.push({ ...post, isCover: false, revisionsOnly: true });
  }
  return linked;
}

// A Moment's images are references like a Post's: the media library treats
// Media a Moment shows as in use.

export async function isMediaInUse(db: DB, key: string): Promise<boolean> {
  const [inPost, inRevision, inMoment] = await Promise.all([
    db
      .select({ id: PostMediaTable.postId })
      .from(PostMediaTable)
      .innerJoin(MediaTable, eq(MediaTable.id, PostMediaTable.mediaId))
      .where(eq(MediaTable.key, key))
      .limit(1),
    db
      .select({ id: PostRevisionMediaTable.revisionId })
      .from(PostRevisionMediaTable)
      .innerJoin(MediaTable, eq(MediaTable.id, PostRevisionMediaTable.mediaId))
      .where(eq(MediaTable.key, key))
      .limit(1),
    db
      .select({ id: MomentImagesTable.momentId })
      .from(MomentImagesTable)
      .innerJoin(MediaTable, eq(MediaTable.id, MomentImagesTable.mediaId))
      .where(eq(MediaTable.key, key))
      .limit(1),
  ]);

  return inPost.length > 0 || inRevision.length > 0 || inMoment.length > 0;
}

export async function getLinkedMediaKeys(
  db: DB,
  keys: Array<string>,
): Promise<Array<string>> {
  if (keys.length === 0) return [];

  const [inPosts, inRevisions, inMoments] = await Promise.all([
    db
      .selectDistinct({ key: MediaTable.key })
      .from(MediaTable)
      .innerJoin(PostMediaTable, eq(MediaTable.id, PostMediaTable.mediaId))
      .where(inArray(MediaTable.key, keys)),
    db
      .selectDistinct({ key: MediaTable.key })
      .from(MediaTable)
      .innerJoin(
        PostRevisionMediaTable,
        eq(MediaTable.id, PostRevisionMediaTable.mediaId),
      )
      .where(inArray(MediaTable.key, keys)),
    db
      .selectDistinct({ key: MediaTable.key })
      .from(MediaTable)
      .innerJoin(
        MomentImagesTable,
        eq(MediaTable.id, MomentImagesTable.mediaId),
      )
      .where(inArray(MediaTable.key, keys)),
  ]);

  return [
    ...new Set([...inPosts, ...inRevisions, ...inMoments].map((r) => r.key)),
  ];
}
