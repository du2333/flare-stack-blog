import { syncPostMedia } from "@/features/posts/data/post-media.data";
import * as PostRevisionRepo from "@/features/posts/data/post-revisions.data";
import * as PostRepo from "@/features/posts/data/posts.data";
import type {
  CreatePostRevisionInput,
  FindPostRevisionByIdInput,
  ListPostRevisionsInput,
  PostRevisionSnapshot,
  RestorePostRevisionInput,
} from "@/features/posts/post-revisions.schema";
import { calculatePostHash } from "@/features/posts/utils/sync";
import { err, ok } from "@/lib/errors";

function toRevisionSnapshot(
  post: Awaited<ReturnType<typeof PostRepo.findPostById>>,
): PostRevisionSnapshot {
  if (!post) {
    throw new Error("Expected post to exist when building revision snapshot");
  }

  return {
    title: post.title,
    summary: post.summary,
    slug: post.slug,
    status: post.status,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    readTimeInMinutes: post.readTimeInMinutes,
    contentJson: post.contentJson,
    tagIds: [...new Set(post.tags.map((tag) => tag.id))].sort((a, b) => a - b),
  };
}

async function hashSnapshot(snapshot: PostRevisionSnapshot) {
  return await calculatePostHash({
    title: snapshot.title,
    contentJson: snapshot.contentJson,
    summary: snapshot.summary,
    tagIds: snapshot.tagIds,
    slug: snapshot.slug,
    publishedAt: snapshot.publishedAt,
    readTimeInMinutes: snapshot.readTimeInMinutes,
  });
}

export async function listPostRevisions(
  context: DbContext,
  data: ListPostRevisionsInput,
) {
  const revisions = await PostRevisionRepo.listPostRevisions(
    context.db,
    data.postId,
  );
  return revisions.map((revision) => ({
    id: revision.id,
    postId: revision.postId,
    reason: revision.reason,
    snapshotHash: revision.snapshotHash,
    restoredFromRevisionId: revision.restoredFromRevisionId,
    createdAt: revision.createdAt,
    title: revision.snapshotJson.title,
    summary: revision.snapshotJson.summary,
  }));
}

export async function findPostRevisionById(
  context: DbContext,
  data: FindPostRevisionByIdInput,
) {
  return await PostRevisionRepo.findPostRevisionById(
    context.db,
    data.postId,
    data.revisionId,
  );
}

export async function createPostRevision(
  context: DbContext,
  data: CreatePostRevisionInput,
) {
  const post = await PostRepo.findPostById(context.db, data.postId);
  if (!post) {
    return err({ reason: "POST_NOT_FOUND" });
  }

  const snapshot = toRevisionSnapshot(post);
  const snapshotHash = await hashSnapshot(snapshot);

  const revision = await PostRevisionRepo.insertPostRevision(context.db, {
    postId: data.postId,
    reason: data.reason ?? "manual",
    snapshotJson: snapshot,
    snapshotHash,
  });

  return ok(revision);
}

export async function restorePostRevision(
  context: DbContext & { executionCtx: ExecutionContext },
  data: RestorePostRevisionInput,
) {
  const [post, revision] = await Promise.all([
    PostRepo.findPostById(context.db, data.postId),
    findPostRevisionById(context, data),
  ]);

  if (!post) {
    return err({ reason: "POST_NOT_FOUND" });
  }

  if (!revision) {
    return err({ reason: "POST_REVISION_NOT_FOUND" });
  }

  const currentSnapshot = toRevisionSnapshot(post);
  const [currentHash, targetHash] = await Promise.all([
    hashSnapshot(currentSnapshot),
    hashSnapshot(revision.snapshotJson),
  ]);

  if (currentHash === targetHash) {
    return ok({
      post,
      restored: false,
      revisionId: revision.id,
    });
  }

  const restoredPost = await PostRevisionRepo.restorePostSnapshot(context.db, {
    postId: data.postId,
    snapshot: revision.snapshotJson,
    backupRevision: {
      reason: "restore_backup",
      snapshotJson: currentSnapshot,
      snapshotHash: currentHash,
      restoredFromRevisionId: revision.id,
    },
  });

  if (!restoredPost) {
    return err({ reason: "POST_NOT_FOUND" });
  }

  if (revision.snapshotJson.contentJson !== undefined) {
    context.executionCtx.waitUntil(
      syncPostMedia(
        context.db,
        restoredPost.id,
        revision.snapshotJson.contentJson,
      ),
    );
  }

  return ok({
    post: restoredPost,
    restored: true,
    revisionId: revision.id,
  });
}
