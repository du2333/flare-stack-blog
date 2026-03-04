---
name: backend-development
description: Backend development patterns for the Flare Stack Blog. Use when creating new feature modules, writing Server Functions, defining Zod schemas, implementing Cloudflare Workflows, or working with middlewares.
---

# Backend Development Patterns

This skill covers the backend module architecture, Server Functions, schema definitions, and async workflows.

## Module Layering

Each feature module (`features/<name>`) follows a strict three-layer architecture:

### 1. Data Layer (`data/[name].data.ts`)

- **Responsibility**: Pure data access. All Drizzle ORM queries live here.
- **Dependencies**: Only receives the DB instance.
- **Prohibited**: No business logic, no caching, no API interactions.

```typescript
// posts.data.ts
export const PostRepo = {
  findPostById: (db: DB, id: number) =>
    db.select().from(posts).where(eq(posts.id, id)).get(),
};
```

### 2. Service Layer (`[name].service.ts`)

- **Responsibility**: Business logic orchestration. Data transformation, caching, calling other services.
- **Error Contract**:
  - Business errors use `Result` (`ok/err`) in service layer.
  - Services with no business error path should return plain `T`.
- **Dependencies**: Receives typed Context object. Use the most specific type needed:
  - `DbContext` for database-only operations
  - `DbContext & { executionCtx: ExecutionContext }` for operations with background tasks
  - `AuthContext` for authenticated operations
- **Caching**: This is the ONLY layer that calls `CacheService.get()` and `CacheService.bumpVersion()`. See `caching-strategies` skill for detailed patterns.

```typescript
// posts.service.ts
import { POSTS_CACHE_KEYS } from "./posts.schema";

export async function findPostBySlug(
  context: DbContext & { executionCtx: ExecutionContext },
  data: { slug: string }
) {
  const fetcher = () => PostRepo.findPostBySlug(context.db, data.slug);
  const version = await CacheService.getVersion(context, "posts:detail");
  return CacheService.get(context, POSTS_CACHE_KEYS.detail(version, data.slug), PostSchema, fetcher);
}

export async function createEmptyPost(context: DbContext) {
  // No executionCtx needed - simple DB operation
  return await PostRepo.insertPost(context.db, { ... });
}
```

### 3. API Layer (`api/[name].api.ts`)

- **Responsibility**: Define Server Functions as frontend RPC entry points. Handle auth and input validation.
- **Pattern**: API should remain thin (middleware + validation + service call). Avoid re-wrapping service return values in API layer when not needed.
- **Pattern**: Use `createServerFn()` with middleware chains to progressively build context.

#### File Naming Convention

Small modules use a single file; larger modules split by access level:

| Pattern | When to use |
| :--- | :--- |
| `api/<name>.api.ts` | Simple modules with few endpoints |
| `api/<name>.public.api.ts` | Public endpoints (no auth required) |
| `api/<name>.admin.api.ts` | Admin-only endpoints |
| `api/<name>.user.api.ts` | Authenticated user endpoints |

#### Middleware Composition

```typescript
import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware, dbMiddleware, createRateLimitMiddleware } from "@/lib/middlewares";
import { CreateTagInputSchema } from "./tags.schema";

// Public endpoint (database only)
export const getPostsFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(({ context }) => PostService.getPosts(context));

// Admin endpoint with Zod validation
export const createTagFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(CreateTagInputSchema) // ← Zod schema, not .validator()
  .handler(({ data, context }) => TagService.createTag(context, data));

// Public endpoint with rate limiting
export const createCommentFn = createServerFn()
  .middleware([
    createRateLimitMiddleware({ capacity: 10, interval: "1m", key: "comments:create" }),
  ])
  .handler(({ data, context }) => CommentService.createComment(context, data));
```

> For CDN caching patterns (Cache-Control headers via page or Hono routes), see the **caching-strategies** skill.

## Schema Definitions (`[name].schema.ts`)

Use `drizzle-zod` to auto-generate base schemas from Drizzle table definitions:

```typescript
import { createSelectSchema, createInsertSchema } from "drizzle-zod";
import { posts } from "@/lib/db/schema";

// Base schemas
export const PostSelectSchema = createSelectSchema(posts);
export const PostInsertSchema = createInsertSchema(posts);

// Derived API schemas
export const CreatePostInputSchema = PostInsertSchema.pick({
  title: true,
  content: true,
});
export const PostResponseSchema = PostSelectSchema.extend({
  author: UserSchema,
});

// Type exports
export type Post = z.infer<typeof PostSelectSchema>;
export type CreatePostInput = z.infer<typeof CreatePostInputSchema>;
```

### Cache Key Factories

Define factories for KV cache keys to ensure consistency and type safety across the service and API layers.

```typescript
export const POSTS_CACHE_KEYS = {
  detail: (version: string, slug: string) => [version, "post", slug] as const,
  list: (version: string, limit: number, cursor: number) =>
    ["posts", "list", version, limit, cursor] as const,
} as const;
```

> For complete caching patterns including versioned invalidation and CDN integration, see the **caching-strategies** skill.

## TanStack Middlewares (`lib/middlewares.ts`)

Middlewares progressively inject dependencies and enforce policies.

### Infrastructure Middlewares (DI)

| Middleware          | Injects           | Depends On     |
| :------------------ | :---------------- | :------------- |
| `dbMiddleware`      | `db`              | (base context) |
| `sessionMiddleware` | `auth`, `session` | `dbMiddleware` |

### Policy Middlewares

| Middleware                        | Purpose                                 | Depends On          |
| :-------------------------------- | :-------------------------------------- | :------------------ |
| `authMiddleware`                  | Requires valid session (request error)  | `sessionMiddleware` |
| `adminMiddleware`                 | Requires admin role (request error)     | `authMiddleware`    |
| `createRateLimitMiddleware(opts)` | Rate limiting via Durable Object        | `sessionMiddleware` |

### Middleware Chain Example

```typescript
import { createPermissionError } from "@/lib/errors";

// adminMiddleware already includes the full chain:
// dbMiddleware -> sessionMiddleware -> private cache -> auth check -> admin check
export const adminMiddleware = createMiddleware()
  .middleware([authMiddleware]) // authMiddleware includes sessionMiddleware which includes dbMiddleware
  .server(async ({ next, context }) => {
    if (context.session.user.role !== "admin") {
      throw createPermissionError();
    }
    return next();
  });
```

## Full-Chain Error Rules

1. Request-level errors (auth/permission/rate-limit/turnstile) are thrown in middleware and handled by global TanStack Query `onError`.
2. Business errors are returned as `Result` in service and consumed in frontend `onSuccess` branches (`if (result.error) { ... }`).

## Cloudflare Workflows

For complex async task orchestration with persistent state.

### Structure

```typescript
export class PostProcessWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    await step.do("process-content", async () => {
      // Atomic, retryable step
    });
  }
}
```

### Retry Configuration

```typescript
await step.do("step-name", {
  retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
}, async () => { ... });
```

### Triggering

```typescript
await context.env.POST_PROCESS_WORKFLOW.create({
  params: { postId, isPublished },
});
```

### Registration

1. Export workflow class in `src/server.ts`
2. Declare in `wrangler.jsonc` workflows array

## Environment Variables

Server-only env vars with Zod validation in `src/lib/env/server.env.ts`:

```typescript
import { serverEnv } from "@/lib/env/server.env";

const env = serverEnv(context.env);
const domain = env.DOMAIN;
```

**Config Files**:

- `.dev.vars`: Local development (not committed)
- Cloudflare Dashboard / Wrangler Secrets: Production

## Structured Logging

Use JSON format for logs to enable search/filtering in Workers Observability:

```typescript
// ✅ Good
console.log(JSON.stringify({ message: "cache hit", key: serializedKey }));
console.error(JSON.stringify({ message: "image transform failed", key, error: String(error) }));

// 🔴 Bad
console.log(`[Cache] HIT: ${serializedKey}`);
console.error("Image transform failed:", error);
```

Use structured logging for request entry/exit, errors, and important business events. Development debug logs can remain as-is.

## Code Quality Checks

After any code changes, **always** run:

```bash
# Type checking
bun tsc --noEmit

# Lint & Format
bun check
```

## Naming Conventions

| Type             | Convention              | Example            |
| :--------------- | :---------------------- | :----------------- |
| Files (layers)   | `[name].[layer].ts`     | `posts.service.ts` |
| Server Functions | camelCase + `Fn` suffix | `getPostsFn`       |
| Constants        | SCREAMING_SNAKE_CASE    | `CACHE_CONTROL`    |
