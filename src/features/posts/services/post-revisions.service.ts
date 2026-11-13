import * as MediaRepo from "@/features/media/data/media.data";
import { syncPostMedia } from "@/features/posts/data/post-media.data";
import * as PostRevisionRepo from "@/features/posts/data/post-revisions.data";
import * as PostRepo from "@/features/posts/data/posts.data";
import * as PublicAssignmentRepo from "@/features/posts/data/public-assignments.data";
import type { DiscardPostChangesInput } from "@/features/posts/schema/posts.schema";
import * as UnpublishedChangesService from "@/features/posts/services/unpublished-changes.service";
import { hasUnpublishedChanges } from "@/features/posts/utils/unpublished-changes";
import type {
  CreatePostRevisionInput,
  CreatePostRevisionResult,
  DeletePostRevisionsInput,
  FindPostRevisionByIdInput,
  ListPostRevisionsInput,
  PostRevisionSnapshot,
  RestorePostRevisionInput,
} from "@/features/posts/schema/post-revisions.schema";
import { parseRevisionSnapshot } from "@/features/posts/schema/post-revisions.schema";
import { removeCodeBlockHighlighting } from "@/features/posts/utils/apply-code-block-highlighting";
import { withEditorAttributes } from "@/features/posts/utils/post-content-rules";
import { convertToPlainText } from "@/features/posts/utils/content";
import { calculatePostHash } from "@/features/posts/utils/sync";
import { isUniqueViolation, POST_SLUG } from "@/lib/db/unique-keys";
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
    contentJson: post.contentJson,
    tagIds: [...new Set(post.tags.map((tag) => tag.id))].sort((a, b) => a - b),
    categoryId: post.categoryId ?? null,
    coverMediaId: post.coverMediaId ?? null,
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
    coverMediaId: snapshot.coverMediaId ?? null,
    categoryId: snapshot.categoryId ?? null,
  });
}

/**
 * Whether writing `slug` into the draft of `post` would take another Post's
 * slug or live page. The slug the draft already has stays its own.
 */
async function slugTakenByAnotherPost(
  db: DB,
  post: { id: number; slug: string },
  slug: string,
) {
  return (
    slug !== post.slug &&
    (await PostRepo.slugExists(db, slug, { excludeId: post.id }))
  );
}

/** A conditional restore wrote nothing: tell a missing Post from a newer save. */
async function editConflictOrNotFound(db: DB, postId: number) {
  const saveToken = await PostRepo.findPostSaveToken(db, postId);
  return saveToken === null
    ? err({ reason: "POST_NOT_FOUND" })
    : err({ reason: "EDIT_CONFLICT", saveToken });
}

/** Characters of text in the body, without whitespace, so the list can show how much a version holds. */
function countBodyCharacters(contentJson: PostRevisionSnapshot["contentJson"]) {
  return (
    convertToPlainText(contentJson).replace(/\s/g, "").match(/./gsu)?.length ??
    0
  );
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
    contentLength: countBodyCharacters(revision.snapshotJson.contentJson),
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

  const post = await PostRepo.findPostById(context.db, data.postId);
  if (!post) {
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
  if (data.saveToken !== undefined && data.saveToken !== post.saveToken) {
    return err({ reason: "EDIT_CONFLICT", saveToken: post.saveToken });
  }

  if (!revision) {
    return err({ reason: "POST_REVISION_NOT_FOUND" });
  }

  const parsedSnapshot = parseRevisionSnapshot(revision.snapshotJson);
  if (!parsedSnapshot) {
    return err({ reason: "POST_REVISION_INVALID_SNAPSHOT" });
  }
  const targetSnapshot = {
    ...parsedSnapshot,
    // A revision an older editor saved can carry attributes a write would
    // now refuse; the restored draft keeps only the editor's.
    contentJson:
      parsedSnapshot.contentJson &&
      withEditorAttributes(parsedSnapshot.contentJson),
    coverMediaId: parsedSnapshot.coverMediaId ?? null,
  };
  if (targetSnapshot.coverMediaId != null) {
    const coverMedia = await MediaRepo.findMediaById(
      context.db,
      targetSnapshot.coverMediaId,
    );
    if (!coverMedia) {
      targetSnapshot.coverMediaId = null;
    }
  }

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

  if (await slugTakenByAnotherPost(context.db, post, targetSnapshot.slug)) {
    return err({ reason: "SLUG_TAKEN" });
  }

  let restoredPost;
  try {
    restoredPost = await PostRevisionRepo.restorePostSnapshot(context.db, {
      postId: data.postId,
      snapshot: targetSnapshot,
      backupRevision: {
        reason: "restore_backup",
        snapshotJson: currentSnapshot,
        snapshotHash: currentHash,
        restoredFromRevisionId: revision.id,
      },
      // Without a stated token, still write only the draft that was backed up.
      saveToken: data.saveToken ?? post.saveToken,
    });
  } catch (error) {
    // Another Post took the slug after the check.
    if (isUniqueViolation(error, POST_SLUG))
      return err({ reason: "SLUG_TAKEN" });
    throw error;
  }

  if (!restoredPost) {
    return editConflictOrNotFound(context.db, post.id);
  }

  // Restoring changes the draft only, its Category and Tags included
  // (ADR 0033), so no public cache needs purging.
  await syncPostMedia(context.db, restoredPost);

  return ok({
    post: restoredPost,
    restored: true,
    revisionId: revision.id,
  });
}

/**
 * Makes the draft of a Published Post match what was published again, from
 * the Public Content Snapshot itself: its title, summary, slug, publication
 * date, cover and body (without the code highlighting publishing added), and
 * the Category and Tags the public site shows. The draft as it is now is
 * saved as a revision first. No Post Revision is read, so deleting them never
 * stops a discard. The public site is not touched. With `saveToken`, a draft
 * saved since that token was read is left as it is and answers EDIT_CONFLICT.
 */
export async function discardUnpublishedChanges(
  context: DbContext,
  data: DiscardPostChangesInput,
) {
  const found = await PostRepo.findPostById(context.db, data.id);
  if (!found) {
    return err({ reason: "POST_NOT_FOUND" });
  }
  if (data.saveToken !== undefined && data.saveToken !== found.saveToken) {
    return err({ reason: "EDIT_CONFLICT", saveToken: found.saveToken });
  }
  const snapshot = found.publicSnapshotJson;
  if (found.status !== "published" || !snapshot) {
    return err({ reason: "POST_NOT_PUBLISHED" });
  }

  const settled = (
    await UnpublishedChangesService.settleFingerprints(context.db, {
      postId: found.id,
    })
  ).get(found.id);
  const post = { ...found, ...settled };
  if (!hasUnpublishedChanges(post)) {
    return err({ reason: "NO_UNPUBLISHED_CHANGES" });
  }

  // Category and Tags are the public ones: the snapshot's ids are not read
  // (ADR 0033), and a Category or Tag deleted since is already gone from them.
  const publicIds = UnpublishedChangesService.publicIdsOf(
    (
      await PublicAssignmentRepo.findPublicAssignments(context.db, [post.id])
    ).get(post.id),
  );
  const coverMediaId = snapshot.cover?.mediaId ?? null;
  const targetSnapshot: PostRevisionSnapshot = {
    title: snapshot.title,
    summary: snapshot.summary,
    slug: snapshot.slug,
    status: "published",
    publishedAt: snapshot.publishedAt,
    contentJson: removeCodeBlockHighlighting(snapshot.contentJson),
    categoryId: publicIds.categoryId,
    tagIds: publicIds.tagIds,
    coverMediaId:
      coverMediaId != null &&
      (await MediaRepo.findMediaById(context.db, coverMediaId))
        ? coverMediaId
        : null,
  };

  if (await slugTakenByAnotherPost(context.db, post, targetSnapshot.slug)) {
    return err({ reason: "SLUG_TAKEN" });
  }

  const currentSnapshot = toRevisionSnapshot(post);
  const discarded = await PostRevisionRepo.restorePostSnapshot(context.db, {
    postId: post.id,
    snapshot: targetSnapshot,
    backupRevision: {
      reason: "restore_backup",
      snapshotJson: currentSnapshot,
      snapshotHash: await hashSnapshot(currentSnapshot),
    },
    // The draft is now what was published, so its fingerprint is the
    // published one. It equals the stored one unless the body came back from
    // the snapshot in a form that hashes differently from the draft it was
    // built from; either way discarding leaves no Unpublished Changes.
    publishedFingerprint:
      await UnpublishedChangesService.fingerprintOfPublished(
        targetSnapshot,
        publicIds,
      ),
    // Without a stated token, still write only the draft that was backed up.
    saveToken: data.saveToken ?? post.saveToken,
  }).catch((error: unknown) => {
    // Another Post took the slug after the check.
    if (isUniqueViolation(error, POST_SLUG)) return "SLUG_TAKEN" as const;
    throw error;
  });
  if (discarded === "SLUG_TAKEN") return err({ reason: "SLUG_TAKEN" });
  if (!discarded) {
    return editConflictOrNotFound(context.db, post.id);
  }

  await syncPostMedia(context.db, discarded);
  return ok({ success: true, saveToken: discarded.saveToken });
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
