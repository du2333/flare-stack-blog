import type { z } from "zod";
import type { Duration } from "@/lib/duration";
import { ms } from "@/lib/duration";
import { serializeKey } from "./serialize";
import type {
  CacheKey,
  PublicCacheReadContext,
  PublicCacheReason,
} from "./types";
import { purgeWorkersCache } from "./workers-cache";
import { purgeOptionsFor } from "./workers-cache-policy";

type InvalidateContext = BaseContext & {
  executionCtx: ExecutionContext;
};

type EntryConfig<
  TParams extends Record<string, unknown>,
  TSchema extends z.ZodTypeAny,
> = {
  name: string;
  key: (params: TParams) => CacheKey;
  schema: TSchema;
  load: (
    context: PublicCacheReadContext,
    params: TParams,
  ) => Promise<z.infer<TSchema>>;
  invalidatedBy: readonly PublicCacheReason[];
  address?: ReadonlyArray<keyof TParams & string>;
  namespace?: string;
  ttl?: Duration;
  hydrate?: (data: z.infer<TSchema>) => z.infer<TSchema>;
};

export type PublicCacheEntry<TParams extends Record<string, unknown>, TData> = {
  name: string;
  get: (context: PublicCacheReadContext, params: TParams) => Promise<TData>;
};

type RegisteredEntry = {
  name: string;
  namespace?: string;
  address: readonly string[];
  ttl: Duration;
  invalidatedBy: readonly PublicCacheReason[];
  key: (params: Record<string, unknown>) => CacheKey;
  schema: z.ZodTypeAny;
  load: (
    context: PublicCacheReadContext,
    params: Record<string, unknown>,
  ) => Promise<unknown>;
  hydrate?: (data: unknown) => unknown;
};

const registry: RegisteredEntry[] = [];

async function readGeneration(
  context: InvalidateContext,
  namespace: string,
): Promise<string | null> {
  const key = `ver:${namespace}`;
  let generation: string | null;
  try {
    generation = await context.env.KV.get(key);
  } catch (err) {
    console.error(
      JSON.stringify({
        message: "public cache get version failed",
        key,
        error: String(err),
      }),
    );
    return null;
  }

  if (generation === null) return "v0";
  if (generation.length === 0) {
    console.error(
      JSON.stringify({
        message: "public cache generation invalid",
        key,
        error: "cache generation is empty",
      }),
    );
    return null;
  }

  return `v${generation}`;
}

async function bumpGeneration(
  context: InvalidateContext,
  namespace: string,
): Promise<void> {
  const key = `ver:${namespace}`;
  const generation = crypto.randomUUID();

  try {
    await context.env.KV.put(key, generation);
  } catch (err) {
    console.error(
      JSON.stringify({
        message: "public cache bump version failed",
        key,
        error: String(err),
      }),
    );
    throw err;
  }
}

function logicalKey(
  entry: RegisteredEntry,
  params: Record<string, unknown>,
): CacheKey {
  return entry.key(params);
}

function storageKey(version: string | undefined, key: CacheKey): string {
  const logical = serializeKey(key);
  return version ? `${version}:${logical}` : logical;
}

function isAddressable(
  entry: RegisteredEntry,
  params: Record<string, unknown>,
): boolean {
  if (entry.namespace && entry.address.length === 0) return false;
  return entry.address.every(
    (name) => params[name] !== undefined && params[name] !== null,
  );
}

async function deleteStorageKey(
  context: InvalidateContext,
  serializedKey: string,
): Promise<void> {
  await context.env.KV.delete(serializedKey).catch((err) =>
    console.error(
      JSON.stringify({
        message: "public cache delete failed",
        key: serializedKey,
        error: String(err),
      }),
    ),
  );
}

async function readEntry<T>(
  entry: RegisteredEntry,
  context: PublicCacheReadContext,
  params: Record<string, unknown>,
): Promise<T> {
  let version: string | undefined;
  if (entry.namespace) {
    const generation = await readGeneration(context, entry.namespace);
    if (generation === null) {
      return (await entry.load(context, params)) as T;
    }
    version = generation;
  }

  const serializedKey = storageKey(version, logicalKey(entry, params));
  const stored = await context.env.KV.get(serializedKey, "json").catch((err) =>
    console.error(
      JSON.stringify({
        message: "public cache get failed",
        key: serializedKey,
        error: String(err),
      }),
    ),
  );

  const persist = async (value: unknown) => {
    await context.env.KV.put(serializedKey, JSON.stringify(value), {
      expirationTtl: Math.floor(ms(entry.ttl) / 1000),
    }).catch((err) =>
      console.error(
        JSON.stringify({
          message: "public cache set failed",
          key: serializedKey,
          error: String(err),
        }),
      ),
    );
  };

  if (stored !== null && stored !== undefined) {
    const parsed = entry.schema.safeParse(stored);
    if (parsed.success) {
      const data = entry.hydrate ? entry.hydrate(parsed.data) : parsed.data;
      if (
        entry.hydrate &&
        JSON.stringify(data) !== JSON.stringify(parsed.data)
      ) {
        context.executionCtx.waitUntil(persist(data));
      }
      return data as T;
    }
  }

  const loaded = await entry.load(context, params);
  if (loaded === null || loaded === undefined) return loaded as T;

  const data = entry.hydrate ? entry.hydrate(loaded) : loaded;
  context.executionCtx.waitUntil(persist(data));
  return data as T;
}

async function invalidateEntry(
  entry: RegisteredEntry,
  context: InvalidateContext,
  params: Record<string, unknown>,
): Promise<void> {
  if (entry.namespace && !isAddressable(entry, params)) {
    await bumpGeneration(context, entry.namespace);
    return;
  }

  let version: string | undefined;
  if (entry.namespace) {
    const generation = await readGeneration(context, entry.namespace);
    if (generation === null) return;
    version = generation;
  }

  await deleteStorageKey(
    context,
    storageKey(version, logicalKey(entry, params)),
  );
}

async function run(
  reason: PublicCacheReason,
  context: InvalidateContext,
  params: Record<string, unknown>,
): Promise<void> {
  await Promise.all(
    registry
      .filter((entry) => entry.invalidatedBy.includes(reason))
      .map((entry) => invalidateEntry(entry, context, params)),
  );
}

export function defineEntry<
  TParams extends Record<string, unknown>,
  TSchema extends z.ZodTypeAny,
>(
  config: EntryConfig<TParams, TSchema>,
): PublicCacheEntry<TParams, z.infer<TSchema>> {
  const registered: RegisteredEntry = {
    name: config.name,
    namespace: config.namespace,
    address: config.address ?? [],
    ttl: config.ttl ?? "7d",
    invalidatedBy: config.invalidatedBy,
    key: (params) => config.key(params as TParams),
    schema: config.schema,
    load: (context, params) => config.load(context, params as TParams),
    hydrate: config.hydrate
      ? (data) => config.hydrate!(data as z.infer<TSchema>)
      : undefined,
  };
  registry.push(registered);

  return {
    name: config.name,
    get: (context, params) =>
      readEntry(registered, context, params as Record<string, unknown>),
  };
}

export const invalidate = {
  async postPopularityUpdated(context: InvalidateContext) {
    await run("post-popularity.updated", context, {});
    await purgeWorkersCache(
      context.executionCtx,
      purgeOptionsFor("post-popularity.updated", {}),
    );
  },
  async postPublished(context: InvalidateContext, params: { slug: string }) {
    await run("post.published", context, params);
    await purgeWorkersCache(
      context.executionCtx,
      purgeOptionsFor("post.published", params),
    );
  },
  async postDeleted(context: InvalidateContext, params: { slug: string }) {
    await run("post.deleted", context, params);
    await purgeWorkersCache(
      context.executionCtx,
      purgeOptionsFor("post.deleted", params),
    );
  },
  async tagChanged(context: InvalidateContext, params?: { slugs?: string[] }) {
    const slugs = params?.slugs ?? [];
    if (slugs.length === 0) {
      await run("tag.changed", context, {});
    } else {
      await Promise.all(
        slugs.map((slug) => run("tag.changed", context, { slug })),
      );
    }
    await purgeWorkersCache(
      context.executionCtx,
      purgeOptionsFor("tag.changed", slugs.length > 0 ? { slugs } : {}),
    );
  },
  async categoryChanged(
    context: InvalidateContext,
    params?: { slugs?: string[] },
  ) {
    const slugs = params?.slugs ?? [];
    if (slugs.length === 0) {
      await run("category.changed", context, {});
    } else {
      await Promise.all(
        slugs.map((slug) => run("category.changed", context, { slug })),
      );
    }
    await purgeWorkersCache(
      context.executionCtx,
      purgeOptionsFor("category.changed", slugs.length > 0 ? { slugs } : {}),
    );
  },
  async friendLinksChanged(context: InvalidateContext) {
    await run("friend-links.changed", context, {});
    await purgeWorkersCache(
      context.executionCtx,
      purgeOptionsFor("friend-links.changed", {}),
    );
  },
  async siteConfigChanged(context: InvalidateContext) {
    await run("site-config.changed", context, {});
    await purgeWorkersCache(
      context.executionCtx,
      purgeOptionsFor("site-config.changed", {}),
    );
  },
  async all(context: InvalidateContext) {
    await Promise.all(
      registry.map((entry) => invalidateEntry(entry, context, {})),
    );
    await purgeWorkersCache(context.executionCtx, purgeOptionsFor("all", {}));
  },
};
