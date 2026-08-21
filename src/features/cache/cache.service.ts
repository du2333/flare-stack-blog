import type { z } from "zod";
import { TAGS_CACHE_KEYS } from "@/features/tags/tags.schema";
import type { Duration } from "@/lib/duration";
import { ms } from "@/lib/duration";
import { serializeKey } from "./cache.utils";
import type { CacheKey, CacheNamespace } from "./types";

/**
 * 缓存数据
 * @param options.ttl - 缓存时间 (秒) 默认 3600 秒 (1 小时)
 */
export async function get<T extends z.ZodTypeAny>(
  context: BaseContext & { executionCtx: ExecutionContext },
  key: CacheKey,
  schema: T,
  fetcher: () => Promise<z.infer<T>>,
  options: { ttl?: Duration } = {},
): Promise<z.infer<T>> {
  const { ttl = "1h" } = options;
  const { env } = context;
  const serializedKey = serializeKey(key);

  const kvData = await env.KV.get(serializedKey, "json").catch((err) =>
    console.error(
      JSON.stringify({
        message: "cache get failed",
        key: serializedKey,
        error: String(err),
      }),
    ),
  );

  if (kvData !== null && kvData !== undefined) {
    const result = schema.safeParse(kvData);
    if (result.success) {
      console.log(JSON.stringify({ message: "cache hit", key: serializedKey }));
      return result.data;
    }
  }

  const data = await fetcher();

  if (data === null || data === undefined) return data;

  context.executionCtx.waitUntil(
    set(context, key, JSON.stringify(data), { ttl }),
  );

  console.log(JSON.stringify({ message: "cache miss", key: serializedKey }));
  return data;
}

/**
 * 读取单个缓存 key (不带 fetcher 回源逻辑)
 */
export async function getRaw(
  context: BaseContext,
  key: CacheKey,
): Promise<string | null> {
  const serializedKey = serializeKey(key);
  const value = await context.env.KV.get(serializedKey).catch((err) => {
    console.error(
      JSON.stringify({
        message: "cache get raw failed",
        key: serializedKey,
        error: String(err),
      }),
    );
    return null;
  });
  return value;
}

/**
 * 设置缓存数据
 * @param options.ttl - 缓存时间 (秒)，不设置则永久
 */
export async function set(
  context: BaseContext,
  key: CacheKey,
  value: string,
  options?: { ttl?: Duration },
): Promise<void> {
  const serializedKey = serializeKey(key);
  const putOptions = options?.ttl
    ? { expirationTtl: Math.floor(ms(options.ttl) / 1000) }
    : undefined;

  await context.env.KV.put(serializedKey, value, putOptions)
    .then(() =>
      console.log(JSON.stringify({ message: "cache set", key: serializedKey })),
    )
    .catch((err) =>
      console.error(
        JSON.stringify({
          message: "cache set failed",
          key: serializedKey,
          error: String(err),
        }),
      ),
    );
}

export async function deleteKey(
  context: BaseContext,
  ...keys: Array<CacheKey>
): Promise<void> {
  const serializedKeys = keys.map(serializeKey);

  await Promise.all(
    serializedKeys.map((key) =>
      context.env.KV.delete(key).catch((err) =>
        console.error(
          JSON.stringify({
            message: "cache delete failed",
            key,
            error: String(err),
          }),
        ),
      ),
    ),
  );
}

/**
 * 获取缓存 generation token。
 * 规范：Namespace 建议使用 "entity:scope" 格式，如 "posts:list"。
 */
export async function getVersion(
  context: BaseContext,
  namespace: CacheNamespace,
): Promise<string> {
  const key = `ver:${namespace}`;
  let generation: string | null;
  try {
    generation = await context.env.KV.get(key);
  } catch (err) {
    console.error(
      JSON.stringify({
        message: "cache get version failed",
        key,
        error: String(err),
      }),
    );
    throw err;
  }

  if (generation === null) return "v0";
  if (generation.length === 0) {
    const error = new Error("cache generation is empty");
    console.error(
      JSON.stringify({
        message: "cache generation invalid",
        key,
        error: error.message,
      }),
    );
    throw error;
  }

  return `v${generation}`;
}

/**
 * 生成新的 cache generation，使旧 generation 的 key 全部不可达。
 */
export async function bumpVersion(
  context: BaseContext,
  namespace: CacheNamespace,
): Promise<void> {
  const key = `ver:${namespace}`;
  const generation = crypto.randomUUID();

  try {
    await context.env.KV.put(key, generation);
  } catch (err) {
    console.error(
      JSON.stringify({
        message: "cache bump version failed",
        key,
        error: String(err),
      }),
    );
    throw err;
  }

  console.log(
    JSON.stringify({
      message: "cache version bumped",
      key,
      generation,
    }),
  );
}

/**
 * 读取 versioned cache；generation pointer 不可用时直接回源。
 */
export async function getVersioned<T extends z.ZodTypeAny>(
  context: BaseContext & { executionCtx: ExecutionContext },
  namespace: CacheNamespace,
  keyForVersion: (version: string) => CacheKey,
  schema: T,
  fetcher: () => Promise<z.infer<T>>,
  options: { ttl?: Duration } = {},
): Promise<z.infer<T>> {
  let version: string;
  try {
    version = await getVersion(context, namespace);
  } catch {
    return await fetcher();
  }

  return await get(context, keyForVersion(version), schema, fetcher, options);
}

export async function invalidateSiteCache(
  context: BaseContext & { executionCtx: ExecutionContext },
) {
  await Promise.all([
    bumpVersion(context, "posts:list"),
    bumpVersion(context, "posts:detail"),
    deleteKey(context, TAGS_CACHE_KEYS.publicList),
  ]);
  return { success: true };
}
