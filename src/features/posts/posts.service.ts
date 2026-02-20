import { z } from "zod";
import type {
  DeletePostInput,
  FindPostByIdInput,
  FindPostBySlugInput,
  FindRelatedPostsInput,
  GenerateSlugInput,
  GetPostsCountInput,
  GetPostsCursorInput,
  GetPostsInput,
  PreviewSummaryInput,
  StartPostProcessInput,
  UpdatePostInput,
} from "@/features/posts/posts.schema";
import * as CacheService from "@/features/cache/cache.service";
import { syncPostMedia } from "@/features/posts/data/post-media.data";
import * as PostRepo from "@/features/posts/data/posts.data";
import {
  POSTS_CACHE_KEYS,
  PostListResponseSchema,
  PostWithTocSchema,
} from "@/features/posts/posts.schema";
import * as AiService from "@/features/ai/ai.service";
import { generateTableOfContents } from "@/features/posts/utils/toc";
import { convertToPlainText, slugify } from "@/features/posts/utils/content";
import { purgePostCDNCache } from "@/lib/invalidate";
import * as SearchService from "@/features/search/search.service";
import { calculatePostHash } from "@/features/posts/utils/sync";

export async function getPostsCursor(
  context: DbContext & { executionCtx: ExecutionContext },
  data: GetPostsCursorInput,
) {
  const fetcher = async () =>
    await PostRepo.getPostsCursor(context.db, {
      cursor: data.cursor,
      limit: data.limit,
      publicOnly: true,
      tagName: data.tagName,
    });

  const version = await CacheService.getVersion(context, "posts:list");
  const cacheKey = POSTS_CACHE_KEYS.list(
    version,
    data.limit ?? 10,
    data.cursor ?? 0,
    data.tagName ?? "all",
  );

  return await CacheService.get(
    context,
    cacheKey,
    PostListResponseSchema,
    fetcher,
    {
      ttl: "7d",
    },
  );
}

export async function findPostBySlug(
  context: DbContext & { executionCtx: ExecutionContext },
  data: FindPostBySlugInput,
) {
  const fetcher = async () => {
    const post = await PostRepo.findPostBySlug(context.db, data.slug, {
      publicOnly: true,
    });
    if (!post) return null;

    let contentJson = post.contentJson;
    if (contentJson) {
      const { highlightCodeBlocks } =
        await import("@/features/posts/utils/content");
      contentJson = await highlightCodeBlocks(contentJson);
    }

    return {
      ...post,
      contentJson,
      toc: generateTableOfContents(post.contentJson),
    };
  };

  const version = await CacheService.getVersion(context, "posts:detail");
  const cacheKey = POSTS_CACHE_KEYS.detail(version, data.slug);
  return await CacheService.get(context, cacheKey, PostWithTocSchema, fetcher, {
    ttl: "7d",
  });
}

export async function getRelatedPosts(
  context: DbContext & { executionCtx: ExecutionContext },
  data: FindRelatedPostsInput,
) {
  const fetcher = async () => {
    const postIds = await PostRepo.getRelatedPostIds(context.db, data.slug, {
      limit: data.limit,
    });
    return postIds;
  };

  // Cache IDs for 7 days (long-lived cache)
  // This key is NOT dependent on version, so it persists across publishes
  const cacheKey = POSTS_CACHE_KEYS.related(data.slug, data.limit);
  const cachedIds = await CacheService.get(
    context,
    cacheKey,
    z.array(z.number()),
    fetcher,
    {
      ttl: "7d",
    },
  );

  if (cachedIds.length === 0) {
    return [];
  }

  // Real-time hydration: fetch actual post data (automatically filters non-published)
  const posts = await PostRepo.getPublicPostsByIds(context.db, cachedIds);

  // Restore order because SQL 'IN' clause doesn't guarantee order
  const orderedPosts = cachedIds
    .map((id) => posts.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return orderedPosts;
}

export async function generateSummaryByPostId({
  context,
  postId,
}: {
  context: DbContext;
  postId: number;
}) {
  const post = await PostRepo.findPostById(context.db, postId);

  if (!post) {
    throw new Error("Post not found");
  }

  // 如果已经存在摘要，则直接返回
  if (post.summary && post.summary.trim().length > 0) return post;

  const plainText = convertToPlainText(post.contentJson);
  if (plainText.length < 100) {
    return post;
  }

  const { summary } = await AiService.summarizeText(context, plainText);

  const updatedPost = await PostRepo.updatePost(context.db, post.id, {
    summary,
  });

  return updatedPost;
}

// ============ Admin Service Methods ============

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
  const { slug } = await generateSlug(context, { title: "" });

  const post = await PostRepo.insertPost(context.db, {
    title: "",
    slug,
    summary: "",
    status: "draft",
    readTimeInMinutes: 1,
    contentJson: null,
  });

  // No cache/index operations for drafts

  return { id: post.id };
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
    ...post,
    toc: generateTableOfContents(post.contentJson),
  };
}

export async function findPostById(
  context: DbContext,
  data: FindPostByIdInput,
) {
  const post = await PostRepo.findPostById(context.db, data.id);
  if (!post) return null;

  const kvHash = await CacheService.getRaw(
    context,
    POSTS_CACHE_KEYS.syncHash(post.id),
  );
  const hasPublicCache = kvHash !== null;

  let isSynced: boolean;
  if (post.status === "draft") {
    // 草稿：同步 = KV 中没有旧缓存
    isSynced = !hasPublicCache;
  } else {
    // 已发布：同步 = 内容 hash 一致
    const dbHash = await calculatePostHash({
      title: post.title,
      contentJson: post.contentJson,
      summary: post.summary,
      tagIds: post.tags.map((t) => t.id),
      slug: post.slug,
      publishedAt: post.publishedAt,
      readTimeInMinutes: post.readTimeInMinutes,
    });
    isSynced = dbHash === kvHash;
  }

  return { ...post, isSynced, hasPublicCache };
}

export async function updatePost(
  context: DbContext & { executionCtx: ExecutionContext; env?: Env },
  data: UpdatePostInput,
) {
  const updatedPost = await PostRepo.updatePost(context.db, data.id, data.data);
  if (!updatedPost) {
    throw new Error("Post not found");
  }

  if (data.data.contentJson !== undefined) {
    context.executionCtx.waitUntil(
      syncPostMedia(context.db, updatedPost.id, data.data.contentJson),
    );
  }

  return findPostById(context, { id: updatedPost.id });
}

export async function deletePost(
  context: DbContext & { executionCtx: ExecutionContext },
  data: DeletePostInput,
) {
  const post = await PostRepo.findPostById(context.db, data.id);
  if (!post) return;

  await PostRepo.deletePost(context.db, data.id);

  // Only clear cache/index for published posts
  if (post.status === "published") {
    const tasks = [];
    const version = await CacheService.getVersion(context, "posts:detail");
    tasks.push(
      CacheService.deleteKey(
        context,
        POSTS_CACHE_KEYS.detail(version, post.slug),
      ),
    );
    tasks.push(CacheService.bumpVersion(context, "posts:list"));
    tasks.push(SearchService.deleteIndex(context, { id: data.id }));
    tasks.push(purgePostCDNCache(context.env, post.slug));
    tasks.push(
      CacheService.deleteKey(context, POSTS_CACHE_KEYS.syncHash(data.id)),
    );

    context.executionCtx.waitUntil(Promise.all(tasks));
  } else {
    // Even for drafts, clean up hash if exists
    context.executionCtx.waitUntil(
      CacheService.deleteKey(context, POSTS_CACHE_KEYS.syncHash(data.id)),
    );
  }
}

export async function previewSummary(
  context: DbContext,
  data: PreviewSummaryInput,
) {
  const plainText = convertToPlainText(data.contentJson);
  const { summary } = await AiService.summarizeText(context, plainText);
  return { summary };
}

export async function startPostProcessWorkflow(
  context: DbContext,
  data: StartPostProcessInput,
) {
  let publishedAtISO: string | undefined;

  // Check if we need to auto-set the published date
  if (data.status === "published") {
    const post = await PostRepo.findPostById(context.db, data.id);
    if (post && !post.publishedAt) {
      const now = new Date();
      await PostRepo.updatePost(context.db, post.id, {
        publishedAt: now,
      });
      publishedAtISO = now.toISOString();
    } else if (post?.publishedAt) {
      publishedAtISO = post.publishedAt.toISOString();
    }
  }

  await context.env.POST_PROCESS_WORKFLOW.create({
    params: {
      postId: data.id,
      isPublished: data.status === "published",
      publishedAt: publishedAtISO,
    },
  });

  // Defensively terminate any existing scheduled publish workflow for this post
  const scheduledId = `post-${data.id}-scheduled`;
  try {
    const oldInstance =
      await context.env.SCHEDULED_PUBLISH_WORKFLOW.get(scheduledId);
    await oldInstance.terminate();
  } catch {
    // Instance doesn't exist or already completed, ignore
  }

  // If this is a future post, create a new scheduled publish workflow
  if (data.status === "published" && publishedAtISO) {
    const publishDate = new Date(publishedAtISO);
    if (publishDate.getTime() > Date.now()) {
      await context.env.SCHEDULED_PUBLISH_WORKFLOW.create({
        id: scheduledId,
        params: { postId: data.id, publishedAt: publishedAtISO },
      });
    }
  }
}
