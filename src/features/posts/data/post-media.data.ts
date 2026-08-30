import type { JSONContent } from "@tiptap/react";
import { eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { extractAllImageKeys } from "@/features/posts/utils/content";
import { MediaTable, PostMediaTable, PostsTable } from "@/lib/db/schema";

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

export async function syncPostMedia(db: DB, postId: number) {
  const [post] = await db
    .select({
      contentJson: PostsTable.contentJson,
      publicSnapshotJson: PostsTable.publicSnapshotJson,
    })
    .from(PostsTable)
    .where(eq(PostsTable.id, postId))
    .limit(1);

  if (!post) return;

  const usedKeys = referencedImageKeys(
    post.contentJson,
    post.publicSnapshotJson?.contentJson,
  );

  const batchQueries: Array<BatchItem<"sqlite">> = [];

  const deleteQuery = db
    .delete(PostMediaTable)
    .where(eq(PostMediaTable.postId, postId));

  if (usedKeys.length > 0) {
    const mediaRecords = await db
      .select({ id: MediaTable.id })
      .from(MediaTable)
      .where(inArray(MediaTable.key, usedKeys));

    if (mediaRecords.length > 0) {
      const newRelations = mediaRecords.map((media) => ({
        postId,
        mediaId: media.id,
      }));

      batchQueries.push(db.insert(PostMediaTable).values(newRelations));
    }
  }

  await db.batch([deleteQuery, ...batchQueries]);
}

export async function getPostsByMediaKey(db: DB, key: string) {
  const posts = await db
    .select({
      id: PostsTable.id,
      title: PostsTable.title,
      summary: PostsTable.summary,
      slug: PostsTable.slug,
      status: PostsTable.status,
    })
    .from(PostsTable)
    .innerJoin(PostMediaTable, eq(PostsTable.id, PostMediaTable.postId))
    .innerJoin(MediaTable, eq(MediaTable.id, PostMediaTable.mediaId))
    .where(eq(MediaTable.key, key));
  return posts;
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
