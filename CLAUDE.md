# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack blog CMS running on **Cloudflare Workers**. Built with TanStack Start (React 19 SSR meta-framework), Hono (API gateway), Drizzle ORM (D1 SQLite), and Better Auth (GitHub OAuth). All user-facing text is in **Chinese**.

## Commands

```bash
bun dev              # Dev server on port 3000
bun run build        # Production build (generates manifest + vite build)
bun run test         # Run tests (Vitest with Cloudflare Workers pool) — NOT npx vitest
bun lint             # ESLint check
bun lint:fix         # ESLint fix + formatting
bun check            # Type check + lint + format (tsc --noEmit && lint:fix && format)
bun run deploy       # Migrate D1 + wrangler deploy
bun db:generate      # Generate Drizzle migrations
bun db:migrate       # Apply migrations to remote D1
bun db:studio        # Drizzle Studio (visual DB browser)
```

## Architecture

### Dual API System

The app serves data through two parallel API layers:

1. **TanStack Start Server Functions** — Type-safe RPCs for SSR-compatible data fetching. Defined in `src/features/*/api/*.api.ts`. Used by route loaders and React Query hooks. Support middleware chains (auth, rate limiting, cache headers).

2. **Hono Routes** — REST API at `/api/*` for public endpoints (posts list, post detail, search). Defined in `src/lib/hono/routes.ts` and `src/features/*/api/hono/`. Used for edge caching via Cloudflare CDN.

Request flow: `server.ts` (Hono entry) routes `/api/auth/*` to Better Auth, `/api/*` to Hono routes, everything else to TanStack Start SSR.

### Feature Modules (`src/features/`)

Each feature follows a layered pattern:

```
features/<name>/
├── api/              # Server functions (TanStack Start) and/or Hono routes
├── data/             # Data access layer — raw Drizzle queries, no business logic
│                     # Functions: (db: DB, params) → Promise<T>
├── <name>.service.ts # Business logic — orchestrates data, cache, workflows
├── <name>.schema.ts  # Zod schemas + cache key factories
├── components/       # React components specific to this feature
├── queries/          # TanStack Query hooks + query key factories
├── utils/            # Feature-specific utilities
└── workflows/        # Cloudflare Workflows (async processing)
```

### Result Type for Error Handling (`src/lib/error.ts`)

Service functions return `Result<TData, { reason: string }>` instead of throwing:

```typescript
import { ok, err } from "@/lib/error";

// Service returns Result
const exists = await TagRepo.nameExists(db, name);
if (exists) return err({ reason: "TAG_NAME_ALREADY_EXISTS" as const });
return ok(tag);

// Consumer handles with exhaustive switch
if (result.error) {
  switch (result.error.reason) {
    case "TAG_NAME_ALREADY_EXISTS":
      throw new Error("标签已存在");
    default:
      result.error.reason satisfies never;
  }
}
```

Use `as const` on reason strings so TypeScript narrows the union. Use `reason satisfies never` for exhaustive checking.

### Middleware Chain (`src/lib/middlewares.ts`)

TanStack Start middleware composes as: `dbMiddleware` → `sessionMiddleware` → `authMiddleware` → `adminMiddleware`. Each layer injects into context (`context.db`, `context.session`, `context.auth`). The `DbContext` type is used widely in service function signatures.

### Caching Strategy

Multi-layer: Cloudflare CDN (Cache-Control headers) → KV Store (versioned keys) → D1. Cache keys are defined as factories in `*.schema.ts` files. Cache invalidation uses version bumping via `CacheService.bumpVersion()`. Background invalidation uses `context.executionCtx.waitUntil()`.

### Routing (`src/routes/`)

TanStack Router filesystem routes. Layout groups: `_public/` (blog pages), `_auth/` (login/register), `_user/` (profile), `admin/` (protected admin panel). SEO routes: `rss[.]xml.ts`, `sitemap[.]xml.ts`, `robots[.]txt.ts`.

### Key Infrastructure

- **Database**: Cloudflare D1 (SQLite) via Drizzle ORM. Schema in `src/lib/db/schema/`. Migrations in `migrations/`.
- **Storage**: Cloudflare R2 for media files, served via `/images/:key` Hono route.
- **Search**: Orama in-memory full-text search, persisted to KV.
- **Rate Limiting**: Cloudflare Durable Objects with token bucket algorithm (`src/lib/rate-limiter.ts`).
- **Auth**: Better Auth with GitHub OAuth. Admin role checked via `ADMIN_EMAIL` env var.
- **Email**: Resend integration (optional).
- **AI**: Cloudflare Workers AI via `workers-ai-provider`.

### Environment Variables

Client-side (Vite-injected, validated in `src/lib/env/client.env.ts`): `VITE_BLOG_*` for blog metadata.
Server-side (Wrangler-injected, validated in `src/lib/env/server.env.ts`): auth secrets, API keys, Cloudflare bindings.

### Testing

Tests run in Cloudflare Workers pool via `@cloudflare/vitest-pool-workers`. Config in `vitest.config.ts` applies D1 migrations and provides mock bindings. Test helpers and mocks live in `tests/`.
