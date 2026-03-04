---
name: caching-strategies
description: Dual-layer caching strategies for the Flare Stack Blog. Use when implementing CDN cache headers, KV caching with versioned invalidation, or debugging cache-related issues.
---

# Caching Strategies

The project employs a dual-layer caching architecture: CDN (HTTP headers) and KV (Cloudflare KV storage).

## CDN Layer (HTTP Headers)

Control browser and CDN caching via response headers. Set headers through page routes or Hono routes.

### Setting Cache Headers in Page Routes

For TanStack Start routes, set headers in the `headers` function:

```typescript
// routes/sitemap[.]xml.ts
export const Route = createFileRoute("/sitemap.xml")({
  headers: () => ({
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
  }),
});
```

### Cache Control Constants (`lib/constants.ts`)

Predefined constants for common scenarios. Each constant is an object with two headers: `Cache-Control` (browser) and `CDN-Cache-Control` (CDN edge). This dual-header pattern lets you control browser and CDN caching independently.

| Constant                    | `Cache-Control` (Browser)            | `CDN-Cache-Control` (CDN)                          | Use Case      |
| :-------------------------- | :----------------------------------- | :------------------------------------------------- | :------------ |
| `CACHE_CONTROL.immutable`   | `public, max-age=31536000, immutable`| `public, max-age=31536000, immutable`              | Static assets |
| `CACHE_CONTROL.swr`         | `public, max-age=0, must-revalidate` | `public, s-maxage=1, stale-while-revalidate=604800`| General pages |
| `CACHE_CONTROL.public`      | `public, max-age=0, must-revalidate` | `public, s-maxage=31536000`                        | Public pages  |
| `CACHE_CONTROL.forbidden`   | `public, max-age=0, must-revalidate` | `public, s-maxage=3600`                            | 403 pages     |
| `CACHE_CONTROL.private`     | `private, no-store, no-cache, must-revalidate` | `private, no-store`                     | Admin pages   |
| `CACHE_CONTROL.notFound`    | `public, max-age=0, must-revalidate` | `public, s-maxage=10`                              | 404 pages     |
| `CACHE_CONTROL.serverError` | `public, max-age=0, must-revalidate` | `public, s-maxage=10`                              | 500 pages     |

### Hono Route Caching

Hono API routes use middleware for cache headers:

```typescript
// lib/hono/middlewares.ts
app.use("/api/*", cacheMiddleware());
```

### Invalidation

Purge CDN cache using the Cloudflare API:

```typescript
await purgePostCDNCache(context.env, post.slug);
```

## KV Layer (Cloudflare KV)

Used for persistent caching of longer-lived data (post lists, details).

### Cache Key Definition

The `CacheKey` type supports both strings and `readonly` arrays (tuples), allowing for type-safe key construction using `as const`.

```typescript
// features/cache/types.ts
export type CacheKey =
  | string
  | readonly (string | number | boolean | null | undefined)[];
```

### Cache Key Factory Pattern

Instead of hardcoding key arrays in services, define **Cache Key Factories** in the feature's `schema.ts`. This provides a single source of truth and ensures types match the requirements of the cache key.

#### 1. Define Factory in `schema.ts`

```typescript
// features/posts/posts.schema.ts
export const POSTS_CACHE_KEYS = {
  /** Post detail cache key (includes version) */
  detail: (version: string, slug: string) => [version, "post", slug] as const,
} as const;
```

#### 2. Use in Service Layer

Pass the tuple directly to `CacheService` functions. No spread (`[...]`) is needed since `CacheKey` supports `readonly` arrays.

```typescript
const version = await CacheService.getVersion(context, "posts:detail");
return await CacheService.get(
  context,
  POSTS_CACHE_KEYS.detail(version, data.slug),
  PostSchema,
  fetcher,
);
```

### Versioned Key Invalidation Strategy

This pattern enables efficient bulk invalidation without iterating through keys:

#### 1. Get Current Version

```typescript
const version = await CacheService.getVersion(context, "posts:detail");
// Returns "v1", "v2", etc.
```

#### 2. Bump Version to Invalidate

When data changes, increment the version number:

```typescript
await CacheService.bumpVersion(context, "posts:detail");
// All old keys with the previous version become unreachable
```

#### 3. Direct Key Deletion

For single-record invalidation, delete the specific key using the factory:

```typescript
const version = await CacheService.getVersion(context, "posts:detail");
await CacheService.deleteKey(context, POSTS_CACHE_KEYS.detail(version, slug));
```

## Complete Example

```typescript
// posts.service.ts
import { POSTS_CACHE_KEYS } from "./posts.schema";

export async function updatePost(
  context: DbContext & { executionCtx: ExecutionContext },
  data: UpdatePostInput,
) {
  // 1. Update in database
  const post = await PostRepo.updatePost(context.db, data);

  // 2. Invalidate KV cache
  await CacheService.bumpVersion(context, "posts:list");
  const version = await CacheService.getVersion(context, "posts:detail");
  await CacheService.deleteKey(context, POSTS_CACHE_KEYS.detail(version, post.slug));

  // 3. Purge CDN cache
  await purgePostCDNCache(context.env, post.slug);

  return post;
}
```

## Cache Namespace Conventions

| Namespace       | Data Type        | Invalidation Trigger          |
| :-------------- | :--------------- | :---------------------------- |
| `posts:list`    | Post listings    | Post create/update/delete     |
| `posts:detail`  | Individual posts | Post update/delete            |
| `tags:list`     | Tag listings     | Tag create/update/delete      |
| `comments:list` | Comment listings | Comment create/approve/delete |

## When to Use Each Layer

| Scenario             | CDN          | KV               |
| :------------------- | :----------- | :--------------- |
| Public API responses | ✅ SWR       | ✅ Version-keyed |
| Admin API responses  | ❌ Private   | Optional         |
| Static assets        | ✅ Immutable | ❌               |
| User-specific data   | ❌ Private   | Depends          |

## Debugging Cache Issues

1. **Stale data after update?**
   - Check if `bumpVersion()` was called
   - Verify CDN purge completed
   - Check cache key construction

2. **Cache misses?**
   - Verify version string consistency
   - Check TTL settings
   - Inspect key serialization

3. **Memory issues?**
   - Review cached data size
   - Consider selective field caching
