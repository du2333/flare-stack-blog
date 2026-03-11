# Contributing Guide

Thank you for considering contributing to this project!

## Quick Start

### Prerequisites

- Node.js 20+
- Bun 1.3+

### Local Development

```bash
# Clone the repository
git clone https://github.com/du2333/flare-stack-blog.git
cd flare-stack-blog

# Install dependencies
bun install

# Configure environment variables
cp .env.example .env            # Client-side variables
cp .dev.vars.example .dev.vars  # Server-side variables
# Edit .env and .dev.vars to fill in the necessary configurations

# Configure Wrangler
cp wrangler.example.jsonc wrangler.jsonc
# Edit wrangler.jsonc with your resource IDs

# Start development server
bun dev
```

Visit http://localhost:3000 to view the application.

Before making changes to the business logic, it is recommended to read the [Error Handling and Result Pattern Quickstart](./error-handling-quickstart.en.md) first.

## Development Workflow

### Pre-commit Checks

Before every commit, ensure you pass the following checks:

```bash
bun check     # Type checking + Linting + Formatting
bun run test  # Run tests
```

### Commit Messages

Use clear and descriptive commit messages following the [Conventional Commits](https://www.conventionalcommits.org/) standard:

```
feat: add RSS feed feature
fix: resolve issue with lost login state
docs: update API documentation
refactor: rewrite caching layer
```

## Code Patterns Cheat Sheet

### 1. Three-Tier Architecture

Each feature module follows a three-tier architecture:

```
features/<name>/
├── data/               # Data Layer: Pure Drizzle queries, no business logic
├── <name>.service.ts   # Service Layer: Business logic + Cache orchestration
├── <name>.schema.ts    # Zod schemas + Cache key factories
└── api/                # API Layer: Server Functions entry points
```

**Data Layer Example**:

```typescript
// posts.data.ts
export const PostRepo = {
  findPostById: (db: DB, id: number) =>
    db.select().from(posts).where(eq(posts.id, id)).get(),
};
```

**Service Layer Example**:

```typescript
// posts.service.ts
export async function findPostBySlug(
  context: DbContext & { executionCtx: ExecutionContext },
  data: { slug: string },
) {
  const fetcher = () => PostRepo.findPostBySlug(context.db, data.slug);
  const version = await CacheService.getVersion(context, "posts:detail");
  return CacheService.get(
    context,
    POSTS_CACHE_KEYS.detail(version, data.slug),
    PostSchema,
    fetcher,
  );
}
```

### 2. Result Type (Error Handling)

Follow these conventions:

1. `Result` is ONLY used for expected business errors (e.g., `POST_NOT_FOUND`, `MEDIA_IN_USE`).
2. Request-level errors (Authentication, Permissions, Rate Limits, CAPTCHA) are `throw`n directly by middleware.
3. Services with no business errors return `T` directly, do not wrap in `ok(...)`.
4. Rely on TypeScript to infer return types by default, explicitly annotate type locks only at public API boundaries.

Example:

```typescript
import { ok, err } from "@/lib/errors";

// Service Layer (with business errors -> Result)
export async function createTag(context: DbContext, name: string) {
  const exists = await TagRepo.nameExists(context.db, name);
  if (exists) return err({ reason: "TAG_NAME_ALREADY_EXISTS" });

  const tag = await TagRepo.insert(context.db, { name });
  return ok(tag);
}

// Caller (query/mutation convention: handle business errors in onSuccess)
const createTagMutation = useMutation({
  mutationFn: (name: string) => createTagFn({ data: { name } }),
  onSuccess: (result) => {
    if (result.error) {
      switch (result.error.reason) {
        case "TAG_NAME_ALREADY_EXISTS":
          toast.error("Tag already exists");
          return;
        default:
          result.error.reason satisfies never; // Exhaustive check
          return;
      }
    }

    toast.success("Tag created");
  },
});

// Service Layer (no business errors -> return T directly)
export async function getTags(context: DbContext) {
  return TagRepo.findAll(context.db);
}
```

### 3. Middleware Chains

TanStack Start middlewares inject dependencies sequentially:

```
dbMiddleware → sessionMiddleware → authMiddleware → adminMiddleware
```

Usage Examples:

```typescript
// Public endpoint + Rate limiting
export const createCommentFn = createServerFn()
  .middleware([
    createRateLimitMiddleware({
      capacity: 10,
      interval: "1m",
      key: "comments:create",
    }),
  ])
  .handler(({ data, context }) => CommentService.createComment(context, data));

// Public endpoint (Database only needed)
export const getPostsFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(({ context }) => PostService.getPosts(context));

// Admin endpoint (Requires authentication + admin privileges)
export const updatePostFn = createServerFn()
  .middleware([adminMiddleware]) // Automatically includes db + session + auth checks
  .handler(({ data, context }) => PostService.updatePost(context, data));
```

### 4. Caching Strategy

Dual-layer caching architecture:

| Layer | Technology            | Purpose                                           |
| ----- | --------------------- | ------------------------------------------------- |
| CDN   | Cache-Control headers | Edge caching, set via page headers or Hono routes |
| KV    | Versioned Keys        | Server-side caching, managed via `CacheService`   |

Invalidation Patterns:

```typescript
// Batch Invalidation: Bump version number
await CacheService.bumpVersion(context, "posts:list");

// Single Item Invalidation: Delete specific key
const version = await CacheService.getVersion(context, "posts:detail");
await CacheService.deleteKey(context, POSTS_CACHE_KEYS.detail(version, slug));
```

### 5. TanStack Query Patterns

Error handling conventions are uniformly maintained in the [Error Handling and Result Pattern Quickstart](./error-handling-quickstart.en.md), and won't be repeated here.

Query Key Factories:

```typescript
export const POSTS_KEYS = {
  all: ["posts"] as const,
  lists: ["posts", "list"] as const, // Parent key (static, used for batch invalidation)
  list: (
    filters?: { tag?: string }, // Child key (function, used for specific queries)
  ) => ["posts", "list", filters] as const,
};
```

#### SSR/Preloading Patterns (Route Loader)

Use `ensureQueryData` or `prefetchQuery` in route loaders to preload data:

```typescript
// routes/_public/post/$slug.tsx
export const Route = createFileRoute("/_public/post/$slug")({
  loader: async ({ context, params }) => {
    // ensureQueryData: Fetch and cache, do not refetch if data already exists
    const post = await context.queryClient.ensureQueryData(
      postBySlugQuery(params.slug),
    );
    if (!post) throw notFound();

    // prefetchQuery: Background preload (non-blocking for render)
    void context.queryClient.prefetchQuery(relatedPostsQuery(params.slug));

    return post;
  },
  component: PostPage,
});
```

#### Component Data Fetching

- **`useSuspenseQuery`**: Used in conjunction with loaders, data is preloaded, rendering is synchronous.
- **`useQuery`**: Pure client-side fetching without preloading.

```typescript
// SSR Scenario (preloaded by loader)
function PostPage() {
  const { slug } = Route.useParams();
  const { data: post } = useSuspenseQuery(postBySlugQuery(slug)); // Synchronous fetch
  return <article>{post.content}</article>;
}

// Pure Client-side Scenario
function RelatedPosts({ slug }: { slug: string }) {
  const { data } = useQuery(relatedPostsQuery(slug)); // Might show a loading state
  // ...
}
```

#### Invalidation Patterns

```typescript
// Batch Invalidation
queryClient.invalidateQueries({ queryKey: POSTS_KEYS.lists });

// Exact Invalidation
queryClient.invalidateQueries({ queryKey: POSTS_KEYS.list({ tag: "React" }) });
```

### 6. Logging Conventions

Use structured JSON logging to facilitate searching and filtering in Workers Observability:

```typescript
// ✅ Good
console.log(JSON.stringify({ message: "cache hit", key: serializedKey }));
console.error(
  JSON.stringify({
    message: "image transform failed",
    key,
    error: String(error),
  }),
);

// 🔴 Bad
console.log(`[Cache] HIT: ${serializedKey}`);
console.error("Image transform failed:", error);
```

Critical business logs (request entry points, errors, important events) should use structured formats. Development debug logs can remain as they are.

## Naming Conventions

| Type                | Convention           | Example            |
| ------------------- | -------------------- | ------------------ |
| Component Files     | kebab-case           | `post-item.tsx`    |
| Service Files       | `<name>.service.ts`  | `posts.service.ts` |
| Data Files          | `<name>.data.ts`     | `posts.data.ts`    |
| Server Functions    | camelCase + `Fn`     | `getPostsFn`       |
| React Components    | PascalCase           | `PostItem`         |
| Variables/Functions | camelCase            | `getPosts`         |
| Types/Interfaces    | PascalCase           | `PostItemProps`    |
| Constants           | SCREAMING_SNAKE_CASE | `CACHE_CONTROL`    |

## Testing

```bash
# Run all tests
bun run test

# Run specific module tests
bun run test posts

# Run logic for a single file
bun run test src/features/posts/posts.service.test.ts
```

### Testing Utilities

```typescript
import {
  createAdminTestContext,
  seedUser,
  waitForBackgroundTasks,
  testRequest,
} from "tests/test-utils";

// Create context
const context = createAdminTestContext();
await seedUser(context.db, context.session.user);

// Wait for background tasks
await waitForBackgroundTasks(context.executionCtx);

// Test Hono routes
const response = await testRequest(app, "/api/posts");
```

## PR Checklist

Before submitting a PR, ensure you have:

- [ ] Passed `bun check` (Type checks + Linting + Formatting)
- [ ] Passed `bun run test`
- [ ] Added test coverage for new features
- [ ] Followed existing code patterns and naming conventions

## Need Help?

If you have any questions, you can:

- Ask questions in GitHub Discussions
- Ask questions in the Telegram Group
- Refer to the development guides under the `.agent/skills/` directory

Thank you for your contributions!
