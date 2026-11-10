import type { JSONContent } from "@tiptap/react";
import { invalidate } from "@/features/cache/public-cache";
import * as CategoryRepo from "@/features/categories/data/categories.data";
import * as MediaRepo from "@/features/media/data/media.data";
import {
  findMissingMediaKeys,
  isMediaGone,
  syncPostMedia,
} from "@/features/posts/data/post-media.data";
import * as PublicAssignmentRepo from "@/features/posts/data/public-assignments.data";
import * as PostRevisionRepo from "@/features/posts/data/post-revisions.data";
import * as PostRepo from "@/features/posts/data/posts.data";
import {
  pinnedPosts,
  homePosts,
  postBySlug,
  postsList,
} from "@/features/posts/posts.cache";
import type {
  CreatePostData,
  DeletePostInput,
  FindPostByIdInput,
  FindPostBySlugInput,
  GenerateSlugInput,
  GetPostsCountInput,
  GetPostsCursorInput,
  GetPostsInput,
  PinPostInput,
  PublishPostInput,
  UnpinPostInput,
  UnpublishPostInput,
  UpdatePostInput,
} from "@/features/posts/schema/posts.schema";
import {
  normalizePostCategoryName,
  normalizePostTagName,
} from "@/features/posts/schema/posts.schema";
import { toIsoOrNull } from "@/features/posts/public-snapshot";
import type { PublicPostCover } from "@/lib/db/schema";

import {
  extractMediaPathImages,
  slugify,
} from "@/features/posts/utils/content";
import {
  isReservedPostSlug,
  truncateGeneratedSlug,
} from "@/features/posts/utils/post-fields";
import { normalizePostContent } from "@/features/posts/utils/normalize-content";
import { contentTooLarge } from "@/features/posts/utils/post-content-size";
import { sameJson } from "@/features/posts/utils/same-json";
import {
  isFuturePublishDate,
  serverUtcDateString,
  toWholeSecond,
} from "@/features/posts/utils/date";
import * as UnpublishedChangesService from "@/features/posts/services/unpublished-changes.service";
import {
  calculateDraftFingerprint,
  calculatePostHash,
} from "@/features/posts/utils/sync";
import {
  hasUnpublishedChanges,
  needsFingerprints,
} from "@/features/posts/utils/unpublished-changes";
import { generateTableOfContents } from "@/features/posts/utils/toc";
import * as SearchService from "@/features/search/service/search.service";
import type { PublicPostSnapshot } from "@/lib/db/schema";
import {
  isUniqueViolation,
  POST_PUBLIC_SLUG,
  POST_SLUG,
} from "@/lib/db/unique-keys";
import { serverEnv } from "@/lib/env/server.env";
import { err, ok } from "@/lib/errors";

function stripPublicSnapshot<
  T extends {
    publicSnapshotJson?: unknown;
    publicSlug?: unknown;
    draftFingerprint?: unknown;
    publishedFingerprint?: unknown;
  },
>(
  post: T,
): Omit<
  T,
  | "publicSnapshotJson"
  | "publicSlug"
  | "draftFingerprint"
  | "publishedFingerprint"
> {
  const {
    publicSnapshotJson: _publicSnapshotJson,
    publicSlug: _publicSlug,
    draftFingerprint: _draftFingerprint,
    publishedFingerprint: _publishedFingerprint,
    ...rest
  } = post;
  return rest;
}

/** `post` with the fingerprints a Published Post had not computed yet. */
async function withSettledFingerprints<
  T extends {
    id: number;
    status: "draft" | "published";
    draftFingerprint: string | null;
    publishedFingerprint: string | null;
  },
>(db: DB, post: T): Promise<T> {
  if (!needsFingerprints(post)) return post;
  const settled = (
    await UnpublishedChangesService.settleFingerprints(db, { postId: post.id })
  ).get(post.id);
  return settled ? { ...post, ...settled } : post;
}

async function resolveSnapshotCover(
  db: DB,
  coverMediaId: number | null | undefined,
): Promise<PublicPostCover | null> {
  if (coverMediaId == null) return null;
  const media = await MediaRepo.findMediaById(db, coverMediaId);
  if (!media) return null;
  return {
    mediaId: media.id,
    key: media.key,
    url: media.url,
    width: media.width,
    height: media.height,
  };
}

function toAdminCover(
  media: NonNullable<Awaited<ReturnType<typeof MediaRepo.findMediaById>>>,
) {
  return {
    id: media.id,
    key: media.key,
    url: media.url,
    fileName: media.fileName,
    width: media.width,
    height: media.height,
  };
}

async function buildPublicSnapshot(
  db: DB,
  post: NonNullable<Awaited<ReturnType<typeof PostRepo.findPostById>>>,
  contentJson: PublicPostSnapshot["contentJson"],
): Promise<PublicPostSnapshot> {
  return {
    title: post.title,
    summary: post.summary,
    slug: post.slug,
    contentJson,
    tagIds: [...new Set(post.tags.map((tag) => tag.id))].sort((a, b) => a - b),
    categoryId: post.categoryId ?? null,
    publishedAt:
      toIsoOrNull(post.publishedAt) ?? toWholeSecond(new Date()).toISOString(),
    lastPublishedAt: new Date().toISOString(),
    cover: await resolveSnapshotCover(db, post.coverMediaId),
  };
}

/**
 * The Media keys a body written into a draft uses by path (`/images/{key}`,
 * alone or on the site's own address), or the images whose Media does not
 * exist. An image the Post's stored draft (`postId`) already shows by path is
 * accepted even when its Media is gone, so a body with an old broken image
 * can still be saved; it cannot be added anew.
 */
async function bodyMediaReferences(
  context: DbContext,
  contentJson: JSONContent | null,
  postId?: number,
) {
  const { db } = context;
  const siteHost = serverEnv(context.env).DOMAIN;
  const images = extractMediaPathImages(contentJson, siteHost);
  const keys = [...new Set(images.map((image) => image.key))];
  const missing = await findMissingMediaKeys(db, keys);
  const refusedKeys = new Set(missing);
  if (refusedKeys.size > 0 && postId !== undefined) {
    const stored = await PostRepo.findPostContentJson(db, postId);
    for (const { key } of extractMediaPathImages(stored, siteHost)) {
      refusedKeys.delete(key);
    }
  }
  const refused = images.filter((image) => refusedKeys.has(image.key));
  if (refused.length > 0) {
    return err({
      reason: "CONTENT_IMAGE_NOT_FOUND",
      images: [...new Set(refused.map((image) => image.src))],
    });
  }
  return ok({ keys: keys.filter((key) => !missing.includes(key)) });
}

function isForeignKeyFailure(error: unknown) {
  for (let current = error; current instanceof Error; current = current.cause) {
    if (/FOREIGN KEY constraint failed/i.test(current.message)) return true;
  }
  return false;
}

/** A conditional write matched nothing: tell a missing Post from a newer save. */
async function editConflictOrNotFound(db: DB, id: number) {
  const saveToken = await PostRepo.findPostSaveToken(db, id);
  if (saveToken === null) {
    return err({ reason: "POST_NOT_FOUND" });
  }
  return err({ reason: "EDIT_CONFLICT", saveToken });
}

async function createPublishRevision(
  context: DbContext,
  post: NonNullable<Awaited<ReturnType<typeof PostRepo.findPostById>>>,
) {
  const tagIds = [...new Set(post.tags.map((tag) => tag.id))].sort(
    (a, b) => a - b,
  );
  const snapshotHash = await calculatePostHash({
    title: post.title,
    contentJson: post.contentJson,
    summary: post.summary,
    tagIds,
    slug: post.slug,
    publishedAt: post.publishedAt,
    coverMediaId: post.coverMediaId,
    categoryId: post.categoryId ?? null,
  });

  const latestPublish = await PostRevisionRepo.findLatestPostRevision(
    context.db,
    post.id,
    { reason: "publish" },
  );
  if (latestPublish?.snapshotHash === snapshotHash) {
    return;
  }

  await PostRevisionRepo.insertPostRevision(context.db, {
    postId: post.id,
    reason: "publish",
    snapshotHash,
    snapshotJson: {
      title: post.title,
      summary: post.summary,
      slug: post.slug,
      status: "published",
      publishedAt: toIsoOrNull(post.publishedAt),
      contentJson: post.contentJson,
      tagIds,
      categoryId: post.categoryId ?? null,
      coverMediaId: post.coverMediaId ?? null,
    },
  });
}

export function getHomePosts(
  context: DbContext & { executionCtx: ExecutionContext },
  page: number,
) {
  return homePosts.get(context, { page });
}

export async function getPinnedPosts(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  return pinnedPosts.get(context, {});
}

export async function getPostsCursor(
  context: DbContext & { executionCtx: ExecutionContext },
  data: GetPostsCursorInput,
) {
  const tagName = normalizePostTagName(data.tagName);
  const categoryName = normalizePostCategoryName(data.categoryName);
  return postsList.get(context, {
    limit: data.limit ?? 10,
    cursor: data.cursor ?? 0,
    tagName,
    categoryName,
    uncategorized: data.uncategorized,
    excludePinned: data.excludePinned,
  });
}

export async function findPostBySlug(
  context: DbContext & { executionCtx: ExecutionContext },
  data: FindPostBySlugInput,
) {
  return postBySlug.get(context, { slug: data.slug });
}

export async function getAdjacentPosts(
  context: DbContext,
  data: FindPostBySlugInput,
) {
  return PostRepo.findAdjacentPublicPosts(context.db, data.slug);
}

export async function generateSlug(
  context: DbContext,
  data: GenerateSlugInput,
) {
  const baseSlug = truncateGeneratedSlug(slugify(data.title));
  // 1. 先查有没有完全一样的 (比如 'hello-world')；保留的 slug 视同已被占用
  const exactMatch =
    isReservedPostSlug(baseSlug) ||
    (await PostRepo.slugExists(context.db, baseSlug, {
      excludeId: data.excludeId,
    }));
  if (!exactMatch) {
    return { slug: baseSlug };
  }

  // 2. 既然 'hello-world' 被占了，那就查所有 'hello-world-%' 的
  const similarSlugs = await PostRepo.findSimilarSlugs(context.db, baseSlug, {
    excludeId: data.excludeId,
  });

  // 3. 在内存里找最大的数字后缀
  // 正则含义：匹配以 "-数字" 结尾的字符串，并捕获那个数字
  const regex = new RegExp(`^${baseSlug}-(\\d+)$`, "i");

  let maxSuffix = 0;
  for (const slug of similarSlugs) {
    const match = slug.match(regex);
    if (match) {
      const number = parseInt(match[1], 10);
      if (number > maxSuffix) {
        maxSuffix = number;
      }
    }
  }

  // 4. 结果就是最大值 + 1
  return { slug: `${baseSlug}-${maxSuffix + 1}` };
}

const SLUG_INSERT_ATTEMPTS = 5;
const SLUG_DERIVED_ATTEMPTS = 2;

function isSlugConflict(error: unknown) {
  return isUniqueViolation(error, POST_SLUG);
}

/**
 * Whether saving `slug` would collide with another Post's slug or live page,
 * ignoring case and NFKC forms. A Post already carrying exactly that slug
 * keeps it, so a collision older than this check does not stop its saves.
 */
async function slugTakenByAnotherPost(db: DB, id: number, slug: string) {
  if (!(await PostRepo.slugExists(db, slug, { excludeId: id }))) return false;
  const own = await PostRepo.findPostSlug(db, id);
  // A missing Post is answered by the write as POST_NOT_FOUND.
  return own !== null && own !== slug;
}

function randomSlugSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * Inserts a draft, deriving its slug from the title and retrying when a
 * concurrent insert claimed that slug first.
 *
 * `generateSlug` reads the existing slugs before the row is written, so two
 * creates racing on the same title derive the same slug and one of them hits
 * the unique index. Retrying the derived slug clears a single straggler, but
 * a whole batch racing at once keeps re-deriving the same next suffix, so
 * after `SLUG_DERIVED_ATTEMPTS` the losers take a random suffix instead. Only
 * a contended batch ever sees one, so ordinary creates keep a readable slug.
 */
async function insertDraftWithGeneratedSlug(
  context: DbContext,
  title: string,
  values: Omit<Parameters<typeof PostRepo.insertPost>[1], "slug">,
  options: Parameters<typeof PostRepo.insertPost>[2] = {},
) {
  for (let attempt = 1; ; attempt += 1) {
    const { slug } = await generateSlug(context, { title });
    const candidate =
      attempt <= SLUG_DERIVED_ATTEMPTS ? slug : `${slug}-${randomSlugSuffix()}`;
    try {
      return await PostRepo.insertPost(
        context.db,
        { ...values, slug: candidate },
        options,
      );
    } catch (error) {
      if (attempt >= SLUG_INSERT_ATTEMPTS || !isSlugConflict(error))
        throw error;
    }
  }
}

/**
 * Creates a brand new draft carrying the given content. Unlike
 * `createEmptyPost`, it never reuses an existing empty draft, so a client can
 * safely retry a failed create or create several posts in a row.
 */
export async function createDraft(context: DbContext, data: CreatePostData) {
  const contentJson = normalizePostContent(data.contentJson ?? null);
  const tooLarge = contentTooLarge("contentJson", contentJson);
  if (tooLarge) return err(tooLarge);

  const references = await bodyMediaReferences(context, contentJson);
  if (references.error) return references;

  let post;
  try {
    post = await insertDraftWithGeneratedSlug(
      context,
      data.title,
      {
        title: data.title,
        summary: data.summary ?? null,
        status: "draft",
        contentJson,
      },
      { media: { keys: references.data.keys, mediaIds: [] } },
    );
  } catch (error) {
    // Media the body uses was deleted after the check; nothing was written.
    if (!isMediaGone(error)) throw error;
    const recheck = await bodyMediaReferences(context, contentJson);
    if (recheck.error) return recheck;
    throw error;
  }

  await syncPostMedia(context.db, post);

  return ok({ id: post.id, saveToken: post.saveToken });
}

export async function createEmptyPost(context: DbContext) {
  try {
    const existing = await PostRepo.findReusableEmptyDraft(context.db);
    if (existing) {
      return { id: existing.id, saveToken: existing.saveToken };
    }
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: "reuse_empty_draft_failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  const post = await insertDraftWithGeneratedSlug(context, "", {
    title: "",
    summary: "",
    status: "draft",
    contentJson: null,
  });

  return { id: post.id, saveToken: post.saveToken };
}

export async function listAdminPostsPage(
  context: DbContext,
  data: GetPostsInput,
) {
  // The list filters and counts in SQL, which compares fingerprints.
  await UnpublishedChangesService.settleFingerprints(context.db);
  const [rows, statusCounts] = await Promise.all([
    getPosts(context, data),
    PostRepo.getAdminPostStatusCounts(context.db, {
      publicOnly: data.publicOnly,
      search: data.search,
      taxonomy: data.taxonomy,
      categoryId: data.categoryId,
      uncategorized: data.uncategorized,
      tagId: data.tagId,
    }),
  ]);
  const draftTotal = data.hasUnpublishedChanges ? 0 : statusCounts.draft;
  const publishedTotal = data.hasUnpublishedChanges
    ? statusCounts.unpublishedChanges
    : statusCounts.published;
  const total =
    data.status === "draft"
      ? draftTotal
      : data.status === "published"
        ? publishedTotal
        : data.status
          ? 0
          : draftTotal + publishedTotal;
  // The assignments the rows are listed under: the public ones for the public
  // taxonomy scope, the draft's otherwise. One batched read for the page.
  const ids = rows.map((row) => row.id);
  const assignments =
    data.taxonomy?.scope === "public"
      ? await PublicAssignmentRepo.findPublicAssignments(context.db, ids)
      : await PostRepo.findCurrentAssignments(context.db, ids);
  const items = rows.map(({ categoryId: _categoryId, ...row }) => ({
    ...row,
    category: assignments.get(row.id)?.category ?? null,
    tags: (assignments.get(row.id)?.tags ?? []).map(({ id, name }) => ({
      id,
      name,
    })),
  }));
  return { items, total, statusCounts };
}

export async function getPosts(context: DbContext, data: GetPostsInput) {
  return await PostRepo.getPosts(context.db, {
    offset: data.offset ?? 0,
    limit: data.limit ?? 10,
    status: data.status,
    publicOnly: data.publicOnly,
    search: data.search,
    taxonomy: data.taxonomy,
    categoryId: data.categoryId,
    uncategorized: data.uncategorized,
    tagId: data.tagId,
    hasUnpublishedChanges: data.hasUnpublishedChanges,
    sortDir: data.sortDir,
    sortBy: data.sortBy,
    includeContent: data.includeContent,
  });
}

export async function getPostsCount(
  context: DbContext,
  data: GetPostsCountInput,
) {
  if (data.hasUnpublishedChanges) {
    await UnpublishedChangesService.settleFingerprints(context.db);
  }
  return await PostRepo.getPostsCount(context.db, {
    hasUnpublishedChanges: data.hasUnpublishedChanges,
    status: data.status,
    publicOnly: data.publicOnly,
    search: data.search,
    taxonomy: data.taxonomy,
    categoryId: data.categoryId,
    uncategorized: data.uncategorized,
    tagId: data.tagId,
  });
}

export async function findPostBySlugAdmin(
  context: DbContext,
  data: FindPostBySlugInput,
) {
  const post = await PostRepo.findPostBySlug(context.db, data.slug, {
    publicOnly: false,
  });
  if (!post) return null;
  return {
    ...stripPublicSnapshot(post),
    toc: generateTableOfContents(post.contentJson),
  };
}

export async function findPostById(
  context: DbContext,
  data: FindPostByIdInput,
) {
  const found = await PostRepo.findPostById(context.db, data.id);
  if (!found) return null;
  const post = await withSettledFingerprints(context.db, found);

  const coverMedia =
    post.coverMediaId == null
      ? null
      : await MediaRepo.findMediaById(context.db, post.coverMediaId);

  return {
    ...stripPublicSnapshot(post),
    publicSlug: post.publicSlug,
    coverMediaId: coverMedia ? post.coverMediaId : null,
    cover: coverMedia ? toAdminCover(coverMedia) : null,
    hasPublicSnapshot: post.publicSnapshotJson != null,
    hasUnpublishedChanges: hasUnpublishedChanges(post),
    publicSnapshotContentJson: post.publicSnapshotJson?.contentJson ?? null,
    serverToday: serverUtcDateString(),
  };
}

export async function postExists(context: DbContext, id: number) {
  return (await PostRepo.findPostSaveToken(context.db, id)) !== null;
}

/**
 * Whether saving `data` would leave the draft as it is: every field it states
 * already holds that value. Dates compare to the whole second, which is all
 * the column keeps.
 */
function leavesDraftUnchanged(
  post: NonNullable<Awaited<ReturnType<typeof PostRepo.findPostById>>>,
  data: UpdatePostInput["data"],
) {
  const seconds = (date: Date | null | undefined) =>
    date == null ? null : Math.floor(date.getTime() / 1000);
  return Object.entries(data).every(([field, value]) => {
    if (value === undefined) return true;
    switch (field) {
      case "title":
      case "summary":
      case "slug":
      case "coverMediaId":
      case "categoryId":
        return post[field] === value;
      case "contentJson":
        return sameJson(post.contentJson, value);
      case "publishedAt":
        return seconds(post.publishedAt) === seconds(value as Date | null);
      default:
        return false;
    }
  });
}

export async function updatePost(
  context: DbContext & { executionCtx: ExecutionContext; env?: Env },
  data: UpdatePostInput,
) {
  if (data.data.coverMediaId != null) {
    const coverMedia = await MediaRepo.findMediaById(
      context.db,
      data.data.coverMediaId,
    );
    if (!coverMedia) {
      return err({ reason: "MEDIA_NOT_FOUND" });
    }
  }

  if (data.data.categoryId != null) {
    const category = await CategoryRepo.findCategoryById(
      context.db,
      data.data.categoryId,
    );
    if (!category) {
      return err({ reason: "CATEGORY_NOT_FOUND" });
    }
  }

  if (
    data.data.slug !== undefined &&
    (await slugTakenByAnotherPost(context.db, data.id, data.data.slug))
  ) {
    return err({ reason: "SLUG_TAKEN" });
  }

  const updateData =
    data.data.contentJson !== undefined
      ? {
          ...data.data,
          contentJson: normalizePostContent(data.data.contentJson),
        }
      : data.data;
  const tooLarge = contentTooLarge("contentJson", updateData.contentJson);
  if (tooLarge) return err(tooLarge);

  // A save that changes nothing writes nothing, so it keeps the saveToken an
  // open editor holds. A stated token still has to be the current one.
  const current = await PostRepo.findPostById(context.db, data.id);
  if (current && leavesDraftUnchanged(current, updateData)) {
    if (data.saveToken !== undefined && data.saveToken !== current.saveToken) {
      return err({ reason: "EDIT_CONFLICT", saveToken: current.saveToken });
    }
    const unchanged = await withSettledFingerprints(context.db, current);
    return ok({
      ...stripPublicSnapshot(unchanged),
      hasUnpublishedChanges: hasUnpublishedChanges(unchanged),
    });
  }

  let bodyKeys: Array<string> = [];
  if (updateData.contentJson !== undefined) {
    const references = await bodyMediaReferences(
      context,
      updateData.contentJson,
      data.id,
    );
    if (references.error) return references;
    bodyKeys = references.data.keys;
  }
  const coverMediaId = updateData.coverMediaId;
  let updatedPost;
  try {
    updatedPost = await PostRepo.updatePost(context.db, data.id, updateData, {
      saveToken: data.saveToken,
      media: {
        keys: bodyKeys,
        mediaIds: coverMediaId == null ? [] : [coverMediaId],
      },
    });
  } catch (error) {
    // A concurrent save claimed the same slug between the check and the write.
    if (isSlugConflict(error)) return err({ reason: "SLUG_TAKEN" });
    // Media or the Category the write uses was deleted after the check (the
    // cover and the Category are foreign keys too); nothing was written.
    if (isMediaGone(error) || isForeignKeyFailure(error)) {
      if (
        coverMediaId != null &&
        !(await MediaRepo.findMediaById(context.db, coverMediaId))
      ) {
        return err({ reason: "MEDIA_NOT_FOUND" });
      }
      if (
        updateData.categoryId != null &&
        !(await CategoryRepo.findCategoryById(
          context.db,
          updateData.categoryId,
        ))
      ) {
        return err({ reason: "CATEGORY_NOT_FOUND" });
      }
      if (updateData.contentJson !== undefined) {
        const recheck = await bodyMediaReferences(
          context,
          updateData.contentJson,
          data.id,
        );
        if (recheck.error) return recheck;
      }
    }
    throw error;
  }
  if (!updatedPost) {
    return editConflictOrNotFound(context.db, data.id);
  }
  const savedPost = await withSettledFingerprints(context.db, updatedPost);

  if (
    updateData.contentJson !== undefined ||
    updateData.coverMediaId !== undefined
  ) {
    await syncPostMedia(context.db, updatedPost);
  }

  // The Category, like every other field, changes the draft only (ADR 0033),
  // so no public cache needs purging.
  return ok({
    ...stripPublicSnapshot(savedPost),
    hasUnpublishedChanges: hasUnpublishedChanges(savedPost),
  });
}

export async function deletePost(
  context: DbContext & { executionCtx: ExecutionContext },
  data: DeletePostInput,
) {
  const post = await PostRepo.findPostById(context.db, data.id);
  if (!post) {
    return err({ reason: "POST_NOT_FOUND" });
  }

  await PostRepo.deletePost(context.db, data.id);

  // Whatever the slug is, even an empty one, the Post leaves the Search Index;
  // the index then only moves if a document was there.
  await SearchService.deleteIndex(context, { id: data.id });
  const publicSlug = post.publicSlug ?? post.publicSnapshotJson?.slug;
  if (publicSlug !== undefined && publicSlug !== null) {
    await invalidate.postDeleted(context, { slug: publicSlug });
  }

  return ok({ success: true });
}

export async function publishPost(
  context: DbContext & { executionCtx: ExecutionContext },
  data: PublishPostInput,
) {
  const post = await PostRepo.findPostById(context.db, data.id);
  if (!post) {
    return err({ reason: "POST_NOT_FOUND" });
  }
  if (data.saveToken !== undefined && data.saveToken !== post.saveToken) {
    return err({ reason: "EDIT_CONFLICT", saveToken: post.saveToken });
  }

  // Draft fields publishing settles. They are written together with the
  // snapshot below, so a refused publish leaves the draft untouched.
  const draft: { publishedAt?: Date; contentJson?: typeof post.contentJson } =
    {};
  if (!post.publishedAt) {
    draft.publishedAt = toWholeSecond(new Date());
  } else if (isFuturePublishDate(post.publishedAt)) {
    return err({ reason: "PUBLISHED_AT_IN_FUTURE" });
  }

  // A Post whose live page already has this slug keeps it, even when an older
  // page differs from it only in case.
  const slugTaken =
    post.publicSlug !== post.slug &&
    (await PostRepo.publicSlugExists(context.db, post.slug, {
      excludeId: post.id,
    }));
  if (slugTaken) {
    return err({ reason: "PUBLIC_SLUG_TAKEN" });
  }

  const normalizedContent = normalizePostContent(post.contentJson);
  if (
    normalizedContent &&
    JSON.stringify(normalizedContent) !== JSON.stringify(post.contentJson)
  ) {
    draft.contentJson = normalizedContent;
  }
  const publishedPost = { ...post, ...draft };

  const { highlightSnapshotContent, snapshotContentFloor } =
    await import("@/features/posts/utils/highlight-code-blocks");
  // Highlighting is the costliest step, so a snapshot that is too large even
  // before it is refused without spending the CPU on it.
  const floor = await buildPublicSnapshot(
    context.db,
    publishedPost,
    snapshotContentFloor(
      publishedPost.contentJson,
      publishedPost.publicSnapshotJson?.contentJson,
    ),
  );
  const floorTooLarge = contentTooLarge("publicSnapshot", floor);
  if (floorTooLarge) return err(floorTooLarge);
  const snapshotContent = await highlightSnapshotContent(
    publishedPost.contentJson,
    publishedPost.publicSnapshotJson?.contentJson,
  );
  const snapshot = { ...floor, contentJson: snapshotContent };
  const snapshotTooLarge = contentTooLarge("publicSnapshot", snapshot);
  if (snapshotTooLarge) return err(snapshotTooLarge);
  const previousPublicSlug = publishedPost.publicSlug;
  const fingerprint = await calculateDraftFingerprint({
    ...publishedPost,
    tagIds: publishedPost.tags.map((tag) => tag.id),
  });
  let published;
  try {
    // A save landing while the snapshot was built changes the token, so a
    // stated token refuses it here rather than publishing a draft nobody read.
    published = await PostRepo.writePublicSnapshot(
      context.db,
      publishedPost.id,
      snapshot,
      {
        draft,
        saveToken: data.saveToken,
        fingerprint: { value: fingerprint, readSaveToken: post.saveToken },
      },
    );
  } catch (error) {
    // Another Post went live under the slug after the check.
    if (isUniqueViolation(error, POST_PUBLIC_SLUG)) {
      return err({ reason: "PUBLIC_SLUG_TAKEN" });
    }
    throw error;
  }
  if (!published) {
    return editConflictOrNotFound(context.db, publishedPost.id);
  }
  await createPublishRevision(context, publishedPost);
  await syncPostMedia(context.db, published);

  await SearchService.upsert(context, {
    id: publishedPost.id,
    slug: snapshot.slug,
    title: snapshot.title,
    summary: snapshot.summary,
    contentJson: snapshotContent,
    tags: publishedPost.tags.map((tag) => tag.name),
    category: publishedPost.category?.name ?? null,
  });

  if (previousPublicSlug && previousPublicSlug !== snapshot.slug) {
    await invalidate.postDeleted(context, { slug: previousPublicSlug });
  }
  await invalidate.postPublished(context, { slug: snapshot.slug });

  return ok({ success: true, saveToken: published.saveToken });
}

export async function unpublishPost(
  context: DbContext & { executionCtx: ExecutionContext },
  data: UnpublishPostInput,
) {
  const post = await PostRepo.findPostById(context.db, data.id);
  if (!post) {
    return err({ reason: "POST_NOT_FOUND" });
  }

  // A draft has no snapshot to discard, so it is left as it is, token and all.
  if (post.status === "draft" && post.publicSnapshotJson == null) {
    return ok({ success: true, saveToken: post.saveToken });
  }

  const publicSlug =
    post.publicSlug ?? post.publicSnapshotJson?.slug ?? post.slug;
  const unpublished = await PostRepo.clearPublicSnapshot(context.db, post.id);
  if (!unpublished) {
    return err({ reason: "POST_NOT_FOUND" });
  }
  await syncPostMedia(context.db, unpublished);
  await SearchService.deleteIndex(context, { id: post.id });
  await invalidate.postDeleted(context, { slug: publicSlug });

  return ok({ success: true, saveToken: unpublished.saveToken });
}

async function setPostPinned(
  context: DbContext & { executionCtx: ExecutionContext },
  id: number,
  pinned: boolean,
) {
  const written = await PostRepo.setPostPinned(context.db, id, pinned);
  if (!written) {
    return err({ reason: "POST_NOT_FOUND" });
  }
  // Pinning orders the whole public site, so a published Post purges at once;
  // a draft's pin only matters once it is published.
  if (written.publicSlug) {
    await invalidate.postPublished(context, { slug: written.publicSlug });
  }
  return ok({ success: true, saveToken: written.saveToken });
}

export function pinPost(
  context: DbContext & { executionCtx: ExecutionContext },
  data: PinPostInput,
) {
  return setPostPinned(context, data.id, true);
}

export function unpinPost(
  context: DbContext & { executionCtx: ExecutionContext },
  data: UnpinPostInput,
) {
  return setPostPinned(context, data.id, false);
}
