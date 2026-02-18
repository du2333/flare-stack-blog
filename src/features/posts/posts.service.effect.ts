/**
 * Effect 版本的 PostsService 示例
 *
 * 这个文件展示了如何使用 Effect 的 Context/Tag 模式来实现文章服务。
 * 与 async/await 版本 (posts.service.ts) 并存，作为 Effect 用法的示例。
 *
 * 主要特点:
 * - 使用 Effect.gen 替代 async/await
 * - 使用 Effect.tryPromise 包装现有的 async/await 函数
 * - 与 Effect 版本的 CacheService 集成
 */

import { Context, Data, Effect, Layer, Schema } from "effect";
import { DatabaseService } from "@/services/db";
import { CacheService } from "@/features/cache/cache.service.effect";
import { generateTableOfContents } from "@/features/posts/utils/toc";
import * as PostRepo from "@/features/posts/data/posts.data";

// Effect 错误类型
export class PostNotFoundError extends Data.TaggedError("PostNotFoundError")<{
  slug: string;
}> {}

export class PostRepositoryError extends Data.TaggedError(
  "PostRepositoryError",
)<{
  message: string;
  cause?: unknown;
}> {}

// 将 Zod Schema 转换为 Effect Schema
// 注意：这里使用 Schema.Unknown 作为简化示例
// 在实际应用中，可以使用 Schema.transform 或手动定义 Effect Schema
const PostListResponseSchema = Schema.Unknown;
const PostWithTocSchema = Schema.Unknown;

// Effect 版本的 PostsService
const make = Effect.gen(function* () {
  const { cachedData, getCacheVersion } = yield* CacheService;
  const { db } = yield* DatabaseService;

  /**
   * 获取分页文章列表 (带缓存)
   */
  const getPostsCursor = (
    options: {
      cursor?: number;
      limit?: number;
      tagName?: string;
    } = {},
  ) =>
    Effect.gen(function* () {
      const version = yield* getCacheVersion("posts:list");
      const cacheKey = [
        "posts",
        "list",
        version,
        options.tagName ?? "all",
        options.limit ?? 10,
        options.cursor ?? 0,
      ];

      // 使用 Effect.tryPromise 包装现有的 async 函数
      const fetcher = Effect.tryPromise({
        try: () =>
          PostRepo.getPostsCursor(db, {
            ...options,
            publicOnly: true,
          }),
        catch: (error) =>
          new PostRepositoryError({
            message: "获取文章列表失败",
            cause: error,
          }),
      });

      return yield* cachedData(cacheKey, PostListResponseSchema, fetcher, {
        ttl: 60 * 60 * 24 * 7, // 7 days
      });
    });

  /**
   * 通过 slug 查找文章 (带缓存)
   */
  const findPostBySlug = (slug: string) =>
    Effect.gen(function* () {
      const effect = Effect.gen(function* () {
        const post = yield* Effect.tryPromise({
          try: () => PostRepo.findPostBySlug(db, slug, { publicOnly: true }),
          catch: (error) =>
            new PostRepositoryError({
              message: `获取文章失败: ${slug}`,
              cause: error,
            }),
        });
        if (!post) return null;
        return {
          ...post,
          toc: generateTableOfContents(post.contentJson),
        };
      });

      const cacheKey = ["post", slug];
      const post = yield* cachedData(cacheKey, PostWithTocSchema, effect, {
        ttl: 60 * 60 * 24 * 7, // 7 days
      });

      if (!post) {
        return yield* new PostNotFoundError({ slug });
      }
      return post;
    });

  return {
    getPostsCursor,
    findPostBySlug,
  } as const;
});

/**
 * Effect 版本的 PostsService
 *
 * 使用方式:
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const { findPostBySlug } = yield* PostsService;
 *   const post = yield* findPostBySlug("my-post-slug");
 *   return post;
 * });
 *
 * const result = await runtime.runPromise(program.pipe(
 *   Effect.provide(PostsService.Live),
 *   Effect.provide(CacheService.Live),
 *   // ... 其他依赖
 * ));
 * ```
 *
 * 注意：PostsService 依赖 CacheService 和 DatabaseService
 */
export class PostsService extends Context.Tag(
  "./features/posts/posts.service.effect/PostsService",
)<PostsService, Effect.Effect.Success<typeof make>>() {
  static readonly Live = Layer.effect(this, make).pipe(
    Layer.provide(CacheService.Live),
  );
}
