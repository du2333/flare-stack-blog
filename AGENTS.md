# AGENTS.md

This document provides guidelines for AI agents working on this codebase.

## Project Overview

A full-stack blog CMS built on **Cloudflare Workers** using React 19, TanStack Router/Query/Start, Hono, and Drizzle ORM with D1 SQLite. Package manager is **Bun**.

## Build/Lint/Test Commands

```bash
# Development
bun dev                 # Start dev server on port 3000

# Quality Checks
bun lint                # ESLint check
bun lint:fix            # ESLint with auto-fix
bun format              # Prettier format all files
bun check               # Run: tsc --noEmit && lint:fix && format

# Testing
bun run test            # Run all tests
bun run test <file>     # Run single test file (e.g., bun run test posts.service.test.ts)
bun run test -t "name"  # Run tests matching pattern

# Build & Deploy
bun run build           # Production build
bun deploy              # Apply D1 migrations and deploy to Workers

# Database
bun db:studio           # Open Drizzle Studio
bun db:generate         # Generate migration from schema changes
bun db:migrate          # Apply migrations to remote D1
bun db:push             # Push schema changes directly (dev only)

# Code Generation
bun cf-typegen          # Generate Cloudflare bindings types
```

## Code Style Guidelines

### Formatting (Prettier)

- Double quotes (`"`) for strings
- 2-space indentation
- Trailing commas on all multiline
- Semicolons required

### TypeScript

- **Strict mode enabled** - no implicit any, unused locals/params are errors
- **Never use `any`** - ESLint rule `@typescript-eslint/no-explicit-any: error`
- Use `type` imports for type-only imports: `import type { Foo } from "./foo"`
- Use path alias `@/*` for `src/*` imports

### File Naming Conventions

- **Components/Hooks**: kebab-case (`post-item.tsx`, `use-debounce.ts`)
- **Layer files**: `[name].[layer].ts` (`posts.service.ts`, `posts.data.ts`, `posts.schema.ts`)
- **Server Functions**: camelCase with `Fn` suffix (`getPostsFn`, `updatePostFn`)
- **Test files**: Co-located as `*.test.ts` (`posts.service.test.ts`)

### Import Order

1. External packages (react, @tanstack/\*, zod, etc.)
2. Internal aliases (`@/features/*`, `@/lib/*`, `@/components/*`)
3. Relative imports (`./`, `../`)
4. Type imports last within each group

## Architecture

### Three-Layer Pattern (Features)

Each feature in `src/features/<feature>/` follows:

```
features/<feature>/
├── api/               # Server Functions (createServerFn)
├── data/              # Data layer - pure Drizzle queries
├── <feature>.service.ts   # Business logic, orchestration, caching
├── <feature>.schema.ts    # Zod schemas + cache key factories
├── components/        # Feature-specific React components
├── queries/           # TanStack Query hooks (queryOptions, mutations)
└── workflows/         # Cloudflare Workflows (async tasks)
```

### Context Types (global.d.ts)

Use the appropriate context type based on operation needs:

| Type             | Contains                        | Use For                  |
| ---------------- | ------------------------------- | ------------------------ |
| `BaseContext`    | `env`                           | Env-only operations      |
| `DbContext`      | `env`, `db`                     | Database operations      |
| `SessionContext` | `env`, `db`, `auth`, `session?` | Session-aware operations |
| `AuthContext`    | `env`, `db`, `auth`, `session`  | Authenticated operations |

### Server Function Pattern

```typescript
export const updatePostFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(UpdatePostInputSchema)
  .handler(({ data, context }) => PostService.updatePost(context, data));
```

### Middleware Chain

Middlewares compose and extend context. Available middlewares in `@/lib/middlewares`:

- `dbMiddleware` - adds `db` to context
- `sessionMiddleware` - adds `auth`, `session` (nullable)
- `authMiddleware` - requires authentication (throws 401)
- `adminMiddleware` - requires admin role (throws 403)
- `createCacheHeaderMiddleware(strategy)` - sets cache headers
- `createRateLimitMiddleware(options)` - rate limiting via Durable Objects

### Query Key Factory Pattern

```typescript
export const POSTS_KEYS = {
  all: ["posts"] as const,
  lists: ["posts", "list"] as const,           // Parent key (for invalidation)
  list: (filters?: {...}) => ["posts", "list", filters] as const,  // Child key
  detail: (id: number) => ["posts", "detail", id] as const,
};
```

## Error Handling

- Use `Response.json()` to throw HTTP errors with status codes:
  ```typescript
  throw Response.json({ message: "UNAUTHENTICATED" }, { status: 401 });
  throw Response.json({ message: "PERMISSION_DENIED" }, { status: 403 });
  ```
- Use Zod schemas for all input validation
- Service layer should validate and throw, API layer should catch and format

## Testing

Uses **Vitest with Cloudflare Workers Vitest Pool** for integration tests with real D1/KV/R2 in isolated Miniflare.

### Test Utilities (`tests/test-utils.ts`)

```typescript
import {
  createAdminTestContext,
  seedUser,
  waitForBackgroundTasks,
} from "tests/test-utils";

describe("PostService", () => {
  let ctx: ReturnType<typeof createAdminTestContext>;

  beforeEach(async () => {
    ctx = createAdminTestContext();
    await seedUser(ctx.db, ctx.session.user);
  });

  it("should create post", async () => {
    const result = await PostService.createEmptyPost(ctx);
    await waitForBackgroundTasks(ctx.executionCtx); // Wait for waitUntil tasks
    expect(result.id).toBeDefined();
  });
});
```

### Available Test Context Factories

- `createTestContext()` - Base context with db and env
- `createAuthTestContext()` - With regular user session
- `createAdminTestContext()` - With admin user session

## Components

### UI Components (`src/components/ui/`)

Use `class-variance-authority` (cva) for variant-based styling:

```typescript
const buttonVariants = cva("base-classes", {
  variants: {
    variant: { default: "...", destructive: "..." },
    size: { default: "...", sm: "...", lg: "..." },
  },
  defaultVariants: { variant: "default", size: "default" },
});
```

### Styling

- TailwindCSS 4 with custom theme in `src/styles.css`
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Semantic CSS variables for colors (e.g., `bg-foreground`, `text-muted`)

## Cloudflare Bindings

Available in `context.env`:

| Binding                       | Type           | Purpose                  |
| ----------------------------- | -------------- | ------------------------ |
| `DB`                          | D1             | SQLite database          |
| `KV`                          | KV             | Cache layer              |
| `R2`                          | R2             | Object storage (media)   |
| `AI`                          | Workers AI     | AI integration           |
| `RATE_LIMITER`                | Durable Object | Rate limiting            |
| `POST_PROCESS_WORKFLOW`       | Workflow       | Post processing          |
| `COMMENT_MODERATION_WORKFLOW` | Workflow       | Comment moderation       |
| `QUEUE`                       | Queue          | Task queue (email, etc.) |

## Additional Resources

Detailed skill guides are available in `.agent/skills/`:

- `project-architecture/SKILL.md` - Full architecture overview
- `backend-development/SKILL.md` - Server functions, services, data layer
- `frontend-development/SKILL.md` - TanStack Query, routing, components
- `testing-guide/SKILL.md` - Testing patterns and utilities
- `styling-guide/SKILL.md` - Design system and CSS patterns
- `caching-strategies/SKILL.md` - CDN and KV caching strategies

## Tools

- When you need to search docs, use `context7` tools.
- If you are unsure how to do something, use `gh_grep` to search code examples from GitHub.
