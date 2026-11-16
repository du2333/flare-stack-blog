import * as MediaRepo from "@/features/media/data/media.data";
import * as PostRevisionRepo from "@/features/posts/data/post-revisions.data";
import * as PostRepo from "@/features/posts/data/posts.data";
import * as PublicAssignmentRepo from "@/features/posts/data/public-assignments.data";
import type { PostRevisionSnapshot } from "@/features/posts/schema/post-revisions.schema";
import { parseRevisionSnapshot } from "@/features/posts/schema/post-revisions.schema";
import type { PublicPostSnapshot } from "@/lib/db/schema";
import { calculateDraftFingerprint } from "@/features/posts/utils/sync";

/*
 * Unpublished Changes compare two fingerprints kept on the Post: the draft's
 * and the one taken when it was published (see the columns on posts.table).
 * Publishing writes both. Every other write that can change the fingerprinted
 * fields only clears the draft's, in the same statement as the write, so
 * there is no window in which it is stale. A null fingerprint on a Published
 * Post means "compute me", and this module computes it: from the current
 * draft for the draft's, and for the published one from the Post's latest
 * publish Post Revision, which holds the draft's content as it was published,
 * and from its public Category and Tags, which are what the public site shows
 * (ADR 0033). A Category or Tag deleted since is already gone from them. The
 * Admin reads settle before they answer.
 *
 * This is also how Posts published before fingerprints existed are filled
 * in: the migration cannot hash, so it leaves null (migration 0026). Their
 * public Category and Tags were backfilled from the live ones (migration
 * 0025), so a Post whose only edits since publishing were to Category or
 * Tags has no Unpublished Changes.
 */

// Each chunk costs a handful of D1 queries whatever its size, and the
// published fingerprint query binds one id per Post.
const SETTLE_CHUNK_SIZE = 50;

export type Fingerprints = {
  draftFingerprint: string | null;
  publishedFingerprint: string | null;
};

export type PublicIds = { categoryId: number | null; tagIds: Array<number> };

export function publicIdsOf(
  assignment: PublicAssignmentRepo.PublicAssignment | undefined,
): PublicIds {
  return {
    categoryId: assignment?.category?.id ?? null,
    tagIds: assignment?.tags.map((tag) => tag.id) ?? [],
  };
}

/**
 * The published version's fields that discarding Unpublished Changes writes
 * into the draft, besides the body: the snapshot's own title, summary, slug,
 * publication date and cover (null once its Media is gone), and the Category
 * and Tags the public site shows. The snapshot's ids are not read (ADR 0033),
 * and a Category or Tag deleted since is already gone from them.
 */
export async function findPublishedVersion(
  db: DB,
  postId: number,
  snapshot: PublicPostSnapshot,
) {
  const publicIds = publicIdsOf(
    (await PublicAssignmentRepo.findPublicAssignments(db, [postId])).get(
      postId,
    ),
  );
  const coverMediaId = snapshot.cover?.mediaId ?? null;
  return {
    title: snapshot.title,
    summary: snapshot.summary,
    slug: snapshot.slug,
    publishedAt: snapshot.publishedAt,
    categoryId: publicIds.categoryId,
    tagIds: publicIds.tagIds,
    coverMedia:
      coverMediaId == null
        ? null
        : ((await MediaRepo.findMediaById(db, coverMediaId)) ?? null),
  };
}

/**
 * Fingerprint of a Post as published: the content of a Post Revision's
 * snapshot, with the Category and Tags the public site shows.
 */
export function fingerprintOfPublished(
  content: PostRevisionSnapshot,
  publicIds: PublicIds,
) {
  return calculateDraftFingerprint({
    title: content.title,
    summary: content.summary,
    slug: content.slug,
    contentJson: content.contentJson,
    publishedAt: content.publishedAt,
    tagIds: publicIds.tagIds,
    coverMediaId: content.coverMediaId,
    categoryId: publicIds.categoryId,
  });
}

type PostToSettle = Awaited<
  ReturnType<typeof PostRepo.findPostsWithoutFingerprints>
>[number];

async function draftFingerprintOf(post: PostToSettle) {
  return calculateDraftFingerprint({
    ...post,
    tagIds: post.postTags.map((postTag) => postTag.tagId),
  });
}

/**
 * Fingerprint of the draft as published. Without a usable publish revision it
 * is built from the snapshot's fields and the draft's body, which takes the
 * body to be unchanged: the snapshot's own body is highlighted and cannot be
 * compared with the draft's.
 */
async function publishedFingerprintOf(
  post: PostToSettle,
  revision: { snapshotJson: unknown } | undefined,
  publicIds: PublicIds,
) {
  const published = parseRevisionSnapshot(revision?.snapshotJson);
  if (published) return fingerprintOfPublished(published, publicIds);

  const snapshot = post.publicSnapshotJson;
  if (!snapshot) return draftFingerprintOf(post);
  return fingerprintOfPublished(
    {
      title: snapshot.title,
      summary: snapshot.summary,
      slug: snapshot.slug,
      status: "published",
      publishedAt: snapshot.publishedAt,
      contentJson: post.contentJson,
      tagIds: [],
      categoryId: null,
      coverMediaId: snapshot.cover?.mediaId ?? null,
    },
    publicIds,
  );
}

/**
 * Computes the fingerprints that are still null on Published Posts, one Post
 * with `postId` or all of them, and returns what each Post now has. Posts with
 * nothing to compute are not in the result.
 */
export async function settleFingerprints(
  db: DB,
  options: { postId?: number } = {},
) {
  const settled = new Map<number, Fingerprints>();
  if (
    options.postId === undefined &&
    !(await PostRepo.hasPostsWithoutFingerprints(db))
  ) {
    return settled;
  }

  let afterId: number | undefined;
  for (;;) {
    const posts = await PostRepo.findPostsWithoutFingerprints(db, {
      postId: options.postId,
      afterId,
      limit: SETTLE_CHUNK_SIZE,
    });
    if (posts.length === 0) break;
    afterId = posts[posts.length - 1].id;

    const needPublished = posts.filter(
      (post) => post.publishedFingerprint === null,
    );
    const needPublishedIds = needPublished.map((post) => post.id);
    const [revisions, assignments] =
      needPublished.length === 0
        ? [[], new Map<number, PublicAssignmentRepo.PublicAssignment>()]
        : await Promise.all([
            PostRevisionRepo.findLatestPublishRevisions(db, needPublishedIds),
            PublicAssignmentRepo.findPublicAssignments(db, needPublishedIds),
          ]);
    const revisionByPost = new Map(
      revisions.map((revision) => [revision.postId, revision]),
    );

    const computed = await Promise.all(
      posts.map(async (post) => ({
        id: post.id,
        saveToken: post.saveToken,
        draftFingerprint:
          post.draftFingerprint ?? (await draftFingerprintOf(post)),
        publishedFingerprint:
          post.publishedFingerprint ??
          (await publishedFingerprintOf(
            post,
            revisionByPost.get(post.id),
            publicIdsOf(assignments.get(post.id)),
          )),
      })),
    );
    await PostRepo.writeFingerprints(db, computed);
    for (const row of computed) {
      settled.set(row.id, {
        draftFingerprint: row.draftFingerprint,
        publishedFingerprint: row.publishedFingerprint,
      });
    }

    if (options.postId !== undefined || posts.length < SETTLE_CHUNK_SIZE) break;
  }
  return settled;
}
