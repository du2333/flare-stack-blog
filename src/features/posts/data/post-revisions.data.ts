import { and, desc, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import {
  type PostRevisionReason,
  type PostRevisionSnapshot,
  PostRevisionsTable,
  PostsTable,
  PostTagsTable,
} from "@/lib/db/schema";
import { findPostById } from "./posts.data";

function normalizeTagIds(tagIds: Array<number>) {
  return [...new Set(tagIds)].sort((a, b) => a - b);
}

export async function listPostRevisions(db: DB, postId: number) {
  return await db.query.PostRevisionsTable.findMany({
    where: eq(PostRevisionsTable.postId, postId),
    orderBy: [desc(PostRevisionsTable.createdAt), desc(PostRevisionsTable.id)],
  });
}

export async function findPostRevisionById(
  db: DB,
  postId: number,
  revisionId: number,
) {
  return await db.query.PostRevisionsTable.findFirst({
    where: and(
      eq(PostRevisionsTable.postId, postId),
      eq(PostRevisionsTable.id, revisionId),
    ),
  });
}

export async function insertPostRevision(
  db: DB,
  data: {
    postId: number;
    reason: PostRevisionReason;
    snapshotJson: PostRevisionSnapshot;
    snapshotHash: string;
    restoredFromRevisionId?: number | null;
  },
) {
  const [revision] = await db
    .insert(PostRevisionsTable)
    .values({
      postId: data.postId,
      reason: data.reason,
      snapshotJson: data.snapshotJson,
      snapshotHash: data.snapshotHash,
      restoredFromRevisionId: data.restoredFromRevisionId ?? null,
    })
    .returning();

  return revision;
}

export async function findLatestPostRevision(
  db: DB,
  postId: number,
  options: {
    reason?: PostRevisionReason;
  } = {},
) {
  return await db.query.PostRevisionsTable.findFirst({
    where: and(
      eq(PostRevisionsTable.postId, postId),
      options.reason
        ? eq(PostRevisionsTable.reason, options.reason)
        : undefined,
    ),
    orderBy: [desc(PostRevisionsTable.createdAt), desc(PostRevisionsTable.id)],
  });
}

export async function trimAutoRevisions(
  db: DB,
  postId: number,
  options: {
    keep: number;
  },
) {
  const revisions = await db.query.PostRevisionsTable.findMany({
    where: and(
      eq(PostRevisionsTable.postId, postId),
      eq(PostRevisionsTable.reason, "auto"),
    ),
    columns: {
      id: true,
    },
    orderBy: [desc(PostRevisionsTable.createdAt), desc(PostRevisionsTable.id)],
  });

  const staleRevisionIds = revisions
    .slice(options.keep)
    .map((revision) => revision.id);
  if (staleRevisionIds.length === 0) {
    return;
  }

  await db
    .delete(PostRevisionsTable)
    .where(inArray(PostRevisionsTable.id, staleRevisionIds));
}

export async function restorePostSnapshot(
  db: DB,
  data: {
    postId: number;
    snapshot: PostRevisionSnapshot;
    backupRevision: {
      reason: PostRevisionReason;
      snapshotJson: PostRevisionSnapshot;
      snapshotHash: string;
      restoredFromRevisionId?: number | null;
    };
  },
) {
  const tagIds = normalizeTagIds(data.snapshot.tagIds);
  const batchQueries: [BatchItem<"sqlite">, ...Array<BatchItem<"sqlite">>] = [
    db.insert(PostRevisionsTable).values({
      postId: data.postId,
      reason: data.backupRevision.reason,
      snapshotJson: data.backupRevision.snapshotJson,
      snapshotHash: data.backupRevision.snapshotHash,
      restoredFromRevisionId:
        data.backupRevision.restoredFromRevisionId ?? null,
    }),
    db
      .update(PostsTable)
      .set({
        title: data.snapshot.title,
        summary: data.snapshot.summary,
        slug: data.snapshot.slug,
        status: data.snapshot.status,
        publishedAt: data.snapshot.publishedAt
          ? new Date(data.snapshot.publishedAt)
          : null,
        readTimeInMinutes: data.snapshot.readTimeInMinutes,
        contentJson: data.snapshot.contentJson,
      })
      .where(eq(PostsTable.id, data.postId)),
    db.delete(PostTagsTable).where(eq(PostTagsTable.postId, data.postId)),
  ];

  if (tagIds.length > 0) {
    batchQueries.push(
      db.insert(PostTagsTable).values(
        tagIds.map((tagId) => ({
          postId: data.postId,
          tagId,
        })),
      ),
    );
  }

  await db.batch(batchQueries);
  return await findPostById(db, data.postId);
}

export async function deletePostRevisions(
  db: DB,
  postId: number,
  revisionIds: Array<number>,
) {
  if (revisionIds.length === 0) {
    return [];
  }

  return await db
    .delete(PostRevisionsTable)
    .where(
      and(
        eq(PostRevisionsTable.postId, postId),
        inArray(PostRevisionsTable.id, revisionIds),
      ),
    )
    .returning({
      id: PostRevisionsTable.id,
    });
}
