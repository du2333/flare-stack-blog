/**
 * Effect 版本的 CacheService 示例
 *
 * 这个文件展示了如何使用 Effect 的 Context/Tag 模式来实现缓存服务。
 * 与 async/await 版本 (cache.service.ts) 并存，作为 Effect 用法的示例。
 *
 * 主要区别:
 * - 使用 Effect.gen 替代 async/await
 * - 使用 Context.Tag 定义服务接口
 * - 使用 Layer 管理依赖注入
 * - 使用 Schema 进行类型安全的编解码
 */

import { Context, Data, Effect, Layer, Option, Schema } from "effect";
import { serializeKey } from "./cache.utils";
import type { CacheKey, CacheNamespace } from "./types";
import { CloudflareExecutionContextService } from "@/services/cloudflare-env";
import { KVService } from "@/services/kv";

// Effect 错误类型
export class CacheError extends Data.TaggedError("CacheError")<{
  message: string;
  cause?: unknown;
}> {}

// Effect 版本的 CacheService
const make = Effect.gen(function* () {
  const { kv } = yield* KVService;
  const { executionCtx } = yield* CloudflareExecutionContextService;

  /**
   * 带缓存的 Effect 数据获取
   * 如果缓存命中，直接返回；否则执行 effect 并缓存结果
   */
  const cachedData = <TType, TEncoded, TSchemaReq, TErr, TReq>(
    key: CacheKey,
    schema: Schema.Schema<TType, TEncoded, TSchemaReq>,
    effect: Effect.Effect<TType, TErr, TReq>,
    options: { ttl?: number } = {},
  ) =>
    Effect.gen(function* () {
      const { ttl = 3600 } = options;
      const serializedKey = serializeKey(key);

      // 尝试从缓存读取
      const cached = yield* Effect.tryPromise({
        try: () => kv.get(serializedKey, "json"),
        catch: (error) =>
          new CacheError({
            message: `获取缓存数据失败: ${String(key)}`,
            cause: error,
          }),
      }).pipe(Effect.option);

      // 如果缓存命中且解码成功，返回缓存数据
      if (Option.isSome(cached)) {
        const decoded = yield* Schema.decodeUnknown(schema)(cached.value).pipe(
          Effect.option,
        );
        if (Option.isSome(decoded)) {
          return decoded.value;
        }
      }

      // 缓存未命中，执行 effect 获取数据
      const data = yield* effect;

      // 后台写入缓存
      if (data !== null && data !== undefined) {
        const backgroundTask = Effect.ignoreLogged(
          Effect.gen(function* () {
            const encodedData = yield* Schema.encode(schema)(data);
            yield* Effect.try({
              try: () =>
                executionCtx.waitUntil(
                  kv.put(serializedKey, JSON.stringify(encodedData), {
                    expirationTtl: ttl,
                  }),
                ),
              catch: (error) =>
                new CacheError({
                  message: `保存缓存数据失败: ${String(key)}`,
                  cause: error,
                }),
            });
          }),
        );
        yield* backgroundTask;
      }

      return data;
    });

  /**
   * 删除缓存数据
   */
  const deleteCachedData = (...keys: Array<CacheKey>) =>
    Effect.gen(function* () {
      const serializedKeys = keys.map(serializeKey);
      yield* Effect.tryPromise({
        try: () =>
          Promise.all(
            serializedKeys.map((key) => executionCtx.waitUntil(kv.delete(key))),
          ),
        catch: (error) =>
          new CacheError({
            message: `删除缓存数据失败: ${keys.join(",")}`,
            cause: error,
          }),
      });
    }).pipe(Effect.catchAll((error) => Effect.logError(error.message)));

  /**
   * 获取缓存版本号
   */
  const getCacheVersion = (namespace: CacheNamespace) =>
    Effect.gen(function* () {
      const key = `ver:${namespace}`;
      const version = yield* Effect.tryPromise({
        try: () => kv.get(key),
        catch: (error) =>
          new CacheError({
            message: `获取缓存版本号失败: ${namespace}`,
            cause: error,
          }),
      }).pipe(
        Effect.tapErrorTag("CacheError", (error) =>
          Effect.logError(error.message),
        ),
        Effect.orElseSucceed(() => null),
      );
      if (version && !Number.isNaN(Number.parseInt(version))) {
        return `v${version}`;
      }
      return "v1";
    });

  /**
   * 升级缓存版本号
   */
  const bumpCacheVersion = (namespace: CacheNamespace) =>
    Effect.gen(function* () {
      const key = `ver:${namespace}`;
      const current = yield* Effect.tryPromise({
        try: () => kv.get(key),
        catch: (error) =>
          new CacheError({
            message: `获取缓存版本号失败: ${namespace}`,
            cause: error,
          }),
      });
      let next = 1;
      if (current) {
        const parsed = Number.parseInt(current);
        if (!Number.isNaN(parsed)) {
          next = parsed + 1;
        }
      }
      yield* Effect.tryPromise({
        try: () => kv.put(key, next.toString()),
        catch: (error) =>
          new CacheError({
            message: `更新缓存版本号失败: ${namespace}`,
            cause: error,
          }),
      });
    }).pipe(Effect.catchAll((error) => Effect.logError(error.message)));

  return {
    cachedData,
    deleteCachedData,
    getCacheVersion,
    bumpCacheVersion,
  } as const;
});

/**
 * Effect 版本的 CacheService
 *
 * 使用方式:
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const { cachedData } = yield* CacheService;
 *   const data = yield* cachedData(
 *     ["posts", "list"],
 *     MySchema,
 *     fetchFromDbEffect
 *   );
 *   return data;
 * });
 *
 * const result = await runtime.runPromise(program.pipe(
 *   Effect.provide(CacheService.Live)
 * ));
 * ```
 */
export class CacheService extends Context.Tag(
  "./features/cache/cache.service.effect/CacheService",
)<CacheService, Effect.Effect.Success<typeof make>>() {
  static readonly Live = Layer.effect(this, make);
}
