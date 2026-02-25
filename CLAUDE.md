# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack blog CMS running on **Cloudflare Workers**. Built with TanStack Start (React 19 SSR meta-framework), Hono (API gateway), Drizzle ORM (D1 SQLite), and Better Auth (GitHub OAuth).

## Commands

```bash
bun dev              # Dev server on port 3000
bun run build        # Production build (generates manifest + vite build)
bun run test         # Run all tests (Vitest with Cloudflare Workers pool) — NOT npx vitest
bun run test posts   # Run tests matching pattern
bun run test src/features/posts/posts.service.test.ts  # Run specific test file
bun lint             # ESLint check
bun lint:fix         # ESLint fix + formatting
bun check            # Type check + lint + format (tsc --noEmit && lint:fix && format)
```

## Architecture

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
if (exists) return err({ reason: "TAG_NAME_ALREADY_EXISTS" });
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

### Middleware Chain (`src/lib/middlewares.ts`)

TanStack Start middleware composes as: `dbMiddleware` → `sessionMiddleware` → `authMiddleware` → `adminMiddleware`. Each layer injects into context (`context.db`, `context.session`, `context.auth`). The `DbContext` type is used widely in service function signatures.

### Caching Strategy

Multi-layer: Cloudflare CDN (Cache-Control headers) → KV Store (versioned keys) → D1. Cache keys are defined as factories in `*.schema.ts` files.

### Environment Variables

Client-side (Vite-injected, validated in `src/lib/env/client.env.ts`).
Server-side (Wrangler-injected, validated in `src/lib/env/server.env.ts`).

### Testing

Tests run in Cloudflare Workers pool via `@cloudflare/vitest-pool-workers`. Config in `vitest.config.ts` applies D1 migrations and provides mock bindings. Test helpers and mocks live in `tests/`.

### Structured Logging

Use JSON format for logs to enable search/filtering in Cloudflare Workers Observability:

```typescript
console.error(
  JSON.stringify({ message: "request failed", error: String(error) }),
);
```
