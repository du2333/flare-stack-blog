import { syncPostMedia } from "@/features/posts/data/post-media.data";
import * as PostRevisionRepo from "@/features/posts/data/post-revisions.data";
import * as PostRepo from "@/features/posts/data/posts.data";
import type {
  CreatePostRevisionInput,
  CreatePostRevisionResult,
  DeletePostRevisionsInput,
  FindPostRevisionByIdInput,
  ListPostRevisionsInput,
  PostRevisionSnapshot,
  RestorePostRevisionInput,
} from "@/features/posts/schema/post-revisions.schema";
import { PostRevisionSnapshotSchema } from "@/features/posts/schema/post-revisions.schema";
import { logPostAutoSnapshot } from "@/features/posts/services/post-auto-snapshot.logging";
import { calculatePostHash } from "@/features/posts/utils/sync";
import { ms } from "@/lib/duration";
import { err, ok } from "@/lib/errors";

const AUTO_SNAPSHOT_MIN_INTERVAL = "2m";
const MAX_AUTO_REVISIONS_PER_POST = 30;

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
  const reason = data.reason ?? "auto";
  if (reason === "auto") {
    logPostAutoSnapshot(context.env, "create_revision_started", {
      postId: data.postId,
      reason,
    });
  }

  const post = await PostRepo.findPostById(context.db, data.postId);
  if (!post) {
    if (reason === "auto") {
      logPostAutoSnapshot(context.env, "create_revision_post_not_found", {
        postId: data.postId,
        reason,
      });
    }
    return err({ reason: "POST_NOT_FOUND" });
  }

  const snapshot = toRevisionSnapshot(post);
  const snapshotHash = await hashSnapshot(snapshot);

  if (reason === "auto") {
    const [latestRevision, latestAutoRevision] = await Promise.all([
      PostRevisionRepo.findLatestPostRevision(context.db, data.postId),
      PostRevisionRepo.findLatestPostRevision(context.db, data.postId, {
        reason: "auto",
      }),
    ]);

    if (latestRevision?.snapshotHash === snapshotHash) {
      logPostAutoSnapshot(context.env, "create_revision_skipped_unchanged", {
        postId: data.postId,
        reason,
        latestRevisionId: latestRevision.id,
      });
      return ok<CreatePostRevisionResult>({
        created: false,
        revision: latestRevision,
        skipReason: "UNCHANGED",
      });
    }

    if (
      latestAutoRevision &&
      Date.now() - latestAutoRevision.createdAt.getTime() <
        ms(AUTO_SNAPSHOT_MIN_INTERVAL)
    ) {
      const nowMs = Date.now();
      const latestAutoRevisionCreatedAtMs =
        latestAutoRevision.createdAt.getTime();
      const minIntervalMs = ms(AUTO_SNAPSHOT_MIN_INTERVAL);
      logPostAutoSnapshot(context.env, "create_revision_skipped_rate_limited", {
        postId: data.postId,
        reason,
        latestAutoRevisionId: latestAutoRevision.id,
        latestAutoRevisionCreatedAtIso:
          latestAutoRevision.createdAt.toISOString(),
        latestAutoRevisionCreatedAtMs,
        nowMs,
        minIntervalMs,
        msSinceLatestAutoRevision: nowMs - latestAutoRevisionCreatedAtMs,
      });
      return ok<CreatePostRevisionResult>({
        created: false,
        revision: latestAutoRevision,
        skipReason: "RATE_LIMITED",
      });
    }
  }

  const revision = await PostRevisionRepo.insertPostRevision(context.db, {
    postId: data.postId,
    reason,
    snapshotJson: snapshot,
    snapshotHash,
  });

  if (reason === "auto") {
    await PostRevisionRepo.trimAutoRevisions(context.db, data.postId, {
      keep: MAX_AUTO_REVISIONS_PER_POST,
    });

    logPostAutoSnapshot(context.env, "create_revision_succeeded", {
      postId: data.postId,
      reason,
      revisionId: revision.id,
    });
  }

  return ok<CreatePostRevisionResult>({
    created: true,
    revision,
  });
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

  const parsedSnapshot = PostRevisionSnapshotSchema.safeParse(
    revision.snapshotJson,
  );
  if (!parsedSnapshot.success) {
    return err({ reason: "POST_REVISION_INVALID_SNAPSHOT" });
  }
  const targetSnapshot = parsedSnapshot.data;

  const currentSnapshot = toRevisionSnapshot(post);
  const [currentHash, targetHash] = await Promise.all([
    hashSnapshot(currentSnapshot),
    hashSnapshot(targetSnapshot),
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
    snapshot: targetSnapshot,
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

  if (targetSnapshot.contentJson !== undefined) {
    context.executionCtx.waitUntil(
      syncPostMedia(context.db, restoredPost.id, targetSnapshot.contentJson),
    );
  }

  return ok({
    post: restoredPost,
    restored: true,
    revisionId: revision.id,
  });
}

export async function deletePostRevisions(
  context: DbContext,
  data: DeletePostRevisionsInput,
) {
  const deletedRevisions = await PostRevisionRepo.deletePostRevisions(
    context.db,
    data.postId,
    [...new Set(data.revisionIds)],
  );

  return ok({
    deletedIds: deletedRevisions.map((revision) => revision.id),
    deletedCount: deletedRevisions.length,
  });
}
