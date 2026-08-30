import { invalidate } from "@/features/cache/public-cache";
import * as MediaRepo from "@/features/media/data/media.data";
import { syncPostMedia } from "@/features/posts/data/post-media.data";
import * as PostRevisionRepo from "@/features/posts/data/post-revisions.data";
import * as PostRepo from "@/features/posts/data/posts.data";
import {
  pinnedPosts,
  postBySlug,
  postsList,
  relatedPostIds,
} from "@/features/posts/posts.cache";
import type {
  DeletePostInput,
  FindPostByIdInput,
  FindPostBySlugInput,
  FindRelatedPostsInput,
  GenerateSlugInput,
  GetPostsCountInput,
  GetPostsCursorInput,
  GetPostsInput,
  PublishPostInput,
  UnpublishPostInput,
  UpdatePostInput,
} from "@/features/posts/schema/posts.schema";
import { normalizePostTagName } from "@/features/posts/schema/posts.schema";
import { toIsoOrNull } from "@/features/posts/public-snapshot";
import type { PublicPostCover } from "@/lib/db/schema";
import { highlightCodeBlocks, slugify } from "@/features/posts/utils/content";
import { normalizePostContent } from "@/features/posts/utils/normalize-content";
import {
  isFuturePublishDate,
  serverUtcDateString,
} from "@/features/posts/utils/date";
import { calculatePostHash } from "@/features/posts/utils/sync";
import { generateTableOfContents } from "@/features/posts/utils/toc";
import * as SearchService from "@/features/search/service/search.service";
import type { PublicPostSnapshot } from "@/lib/db/schema";
import { err, ok } from "@/lib/errors";

function stripPublicSnapshot<
  T extends { publicSnapshotJson?: unknown; publicSlug?: unknown },
>(post: T): Omit<T, "publicSnapshotJson" | "publicSlug"> {
  const {
    publicSnapshotJson: _publicSnapshotJson,
    publicSlug: _publicSlug,
    ...rest
  } = post;
  return rest;
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
    publishedAt: toIsoOrNull(post.publishedAt) ?? new Date().toISOString(),
    pinnedAt: toIsoOrNull(post.pinnedAt),
    cover: await resolveSnapshotCover(db, post.coverMediaId),
  };
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
    pinnedAt: post.pinnedAt,
    coverMediaId: post.coverMediaId,
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
      coverMediaId: post.coverMediaId ?? null,
    },
  });
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
  return postsList.get(context, {
    limit: data.limit ?? 10,
    cursor: data.cursor ?? 0,
    tagName,
    excludePinned: data.excludePinned,
  });
}

export async function findPostBySlug(
  context: DbContext & { executionCtx: ExecutionContext },
  data: FindPostBySlugInput,
) {
  return postBySlug.get(context, { slug: data.slug });
}

export async function getRelatedPosts(
  context: DbContext & { executionCtx: ExecutionContext },
  data: FindRelatedPostsInput,
) {
  const cachedIds = await relatedPostIds.get(context, {
    slug: data.slug,
    limit: data.limit,
  });

  if (cachedIds.length === 0) {
    return [];
  }

  const posts = await PostRepo.getPublicPostsByIds(context.db, cachedIds);

  return cachedIds
    .map((id) => posts.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);
}

export async function generateSlug(
  context: DbContext,
  data: GenerateSlugInput,
) {
  const baseSlug = slugify(data.title);
  // 1. 先查有没有完全一样的 (比如 'hello-world')
  const exactMatch = await PostRepo.slugExists(context.db, baseSlug, {
    excludeId: data.excludeId,
  });
  if (!exactMatch) {
    return { slug: baseSlug };
  }

  // 2. 既然 'hello-world' 被占了，那就查所有 'hello-world-%' 的
  const similarSlugs = await PostRepo.findSimilarSlugs(context.db, baseSlug, {
    excludeId: data.excludeId,
  });

  // 3. 在内存里找最大的数字后缀
  // 正则含义：匹配以 "-数字" 结尾的字符串，并捕获那个数字
  const regex = new RegExp(`^${baseSlug}-(\\d+)$`);

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

export async function createEmptyPost(context: DbContext) {
  try {
    const existing = await PostRepo.findReusableEmptyDraft(context.db);
    if (existing) {
      return { id: existing.id };
    }
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: "reuse_empty_draft_failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  const { slug } = await generateSlug(context, { title: "" });

  const post = await PostRepo.insertPost(context.db, {
    title: "",
    slug,
    summary: "",
    status: "draft",
    contentJson: null,
  });

  return { id: post.id };
}

export async function listAdminPostsPage(
  context: DbContext,
  data: GetPostsInput,
) {
  const [items, total] = await Promise.all([
    getPosts(context, data),
    getPostsCount(context, {
      status: data.status,
      publicOnly: data.publicOnly,
      search: data.search,
      sortBy: data.sortBy,
    }),
  ]);
  return { items, total };
}

export async function getPosts(context: DbContext, data: GetPostsInput) {
  return await PostRepo.getPosts(context.db, {
    offset: data.offset ?? 0,
    limit: data.limit ?? 10,
    status: data.status,
    publicOnly: data.publicOnly,
    search: data.search,
    sortDir: data.sortDir,
    sortBy: data.sortBy,
  });
}

export async function getPostsCount(
  context: DbContext,
  data: GetPostsCountInput,
) {
  return await PostRepo.getPostsCount(context.db, {
    status: data.status,
    publicOnly: data.publicOnly,
    search: data.search,
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
  const post = await PostRepo.findPostById(context.db, data.id);
  if (!post) return null;

  const coverMedia =
    post.coverMediaId == null
      ? null
      : await MediaRepo.findMediaById(context.db, post.coverMediaId);

  return {
    ...stripPublicSnapshot(post),
    coverMediaId: coverMedia ? post.coverMediaId : null,
    cover: coverMedia ? toAdminCover(coverMedia) : null,
    hasPublicSnapshot: post.publicSnapshotJson != null,
    serverToday: serverUtcDateString(),
  };
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

  const updateData =
    data.data.contentJson !== undefined
      ? {
          ...data.data,
          contentJson: normalizePostContent(data.data.contentJson),
        }
      : data.data;
  const updatedPost = await PostRepo.updatePost(
    context.db,
    data.id,
    updateData,
  );
  if (!updatedPost) {
    return err({ reason: "POST_NOT_FOUND" });
  }

  if (
    updateData.contentJson !== undefined ||
    updateData.coverMediaId !== undefined
  ) {
    await syncPostMedia(context.db, updatedPost.id);
  }

  return ok(stripPublicSnapshot(updatedPost));
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

  const publicSlug = post.publicSlug ?? post.publicSnapshotJson?.slug;
  if (publicSlug) {
    await SearchService.deleteIndex(context, { id: data.id });
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

  let publishedPost = post;
  if (!publishedPost.publishedAt) {
    const now = new Date();
    const updated = await PostRepo.updatePost(context.db, post.id, {
      publishedAt: now,
    });
    if (!updated) {
      return err({ reason: "POST_NOT_FOUND" });
    }
    publishedPost = updated;
  } else if (isFuturePublishDate(publishedPost.publishedAt.toISOString())) {
    return err({ reason: "PUBLISHED_AT_IN_FUTURE" });
  }

  const slugTaken = await PostRepo.publicSlugExists(
    context.db,
    publishedPost.slug,
    { excludeId: publishedPost.id },
  );
  if (slugTaken) {
    return err({ reason: "PUBLIC_SLUG_TAKEN" });
  }

  const normalizedContent = normalizePostContent(publishedPost.contentJson);
  if (normalizedContent) {
    const updated = await PostRepo.updatePost(context.db, publishedPost.id, {
      contentJson: normalizedContent,
    });
    if (updated) {
      publishedPost = updated;
    }
  }

  await createPublishRevision(context, publishedPost);

  const highlighted = publishedPost.contentJson
    ? await highlightCodeBlocks(publishedPost.contentJson)
    : null;
  const snapshot = await buildPublicSnapshot(
    context.db,
    publishedPost,
    highlighted,
  );
  const previousPublicSlug = publishedPost.publicSlug;
  await PostRepo.writePublicSnapshot(context.db, publishedPost.id, snapshot);
  await syncPostMedia(context.db, publishedPost.id);

  await SearchService.upsert(
    { env: context.env },
    {
      id: publishedPost.id,
      slug: snapshot.slug,
      title: snapshot.title,
      summary: snapshot.summary,
      contentJson: highlighted,
      tags: publishedPost.tags.map((tag) => tag.name),
    },
  );

  if (previousPublicSlug && previousPublicSlug !== snapshot.slug) {
    await invalidate.postDeleted(context, { slug: previousPublicSlug });
  }
  await invalidate.postPublished(context, { slug: snapshot.slug });

  return ok({ success: true });
}

export async function unpublishPost(
  context: DbContext & { executionCtx: ExecutionContext },
  data: UnpublishPostInput,
) {
  const post = await PostRepo.findPostById(context.db, data.id);
  if (!post) {
    return err({ reason: "POST_NOT_FOUND" });
  }

  const publicSlug =
    post.publicSlug ?? post.publicSnapshotJson?.slug ?? post.slug;
  await PostRepo.clearPublicSnapshot(context.db, post.id);
  await syncPostMedia(context.db, post.id);
  await SearchService.deleteIndex(context, { id: post.id });
  await invalidate.postDeleted(context, { slug: publicSlug });

  return ok({ success: true });
}
