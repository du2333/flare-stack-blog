---
name: mcp-development
description: MCP development patterns for this project. Use when adding or editing MCP tools, schemas, transport routes, or OAuth-protected MCP integrations.
---

# MCP Development

This project exposes a remote MCP server at `/mcp`, protected by Better Auth OAuth 2.1.

## Core Rules

- Keep MCP-specific code inside `src/features/mcp/`.
- Reuse existing business services. MCP is an adapter layer, not a second backend.
- Prefer AI-friendly outputs. Return markdown or structured JSON, not raw editor JSON.
- Keep tool names lowercase with underscores: `posts_get`, `posts_list`, `search_posts`.
- Add concise `.describe()` text to all MCP input fields and important output fields.

## Route Behavior

- MCP entrypoint: `src/features/mcp/api/mcp.route.ts`
- Supported method: `POST /mcp`
- `GET /mcp` must explicitly return `405` with `Allow: POST`
  This avoids HTML 404 responses and works better with clients like Cursor.

## Auth Model

- OAuth provider lives under `src/features/oauth-provider/`.
- MCP requests are authenticated with bearer tokens through the OAuth middleware.
- Tool permissions reuse OAuth scopes such as:
  - `posts:read`
  - `posts:write`
  - `comments:read`
  - `comments:write`
  - `media:read`
  - `media:write`
  - `settings:read`
  - `settings:write`

## Directory Shape

Organize MCP tools as sub-features:

```text
src/features/mcp/
  api/
  service/
  features/
    posts/
      schema/
      service/
      tools/
      index.ts
    search/
      schema/
      service/
      tools/
      index.ts
```

Use this split:

- `features/<domain>/schema/`: MCP-only Zod schemas
- `features/<domain>/service/`: MCP formatting/adaptation logic
- `features/<domain>/tools/`: individual tool definitions
- `features/<domain>/index.ts`: export that domain's tools
- `service/mcp-tool-registry.ts`: central registration list

## Tool Design

Each tool should:

- declare `name`, `description`, `requiredScopes`, `inputSchema`, and `handler`
- use `defineMcpTool(...)`
- return JSON-safe data only
- avoid raw `Date`, `Map`, `Set`, `z.custom()`, or editor-specific content trees

If business data is not MCP-safe, create an MCP-specific schema and mapper.

## Content Guidelines

- For post bodies, prefer markdown over plain text or raw `contentJson`
- Reuse existing serializers when possible
- For search, return readable snippets and metadata, not internal index shapes

## Adding a New Tool

1. Reuse an existing feature service if it already solves the business problem.
2. Create MCP-safe schemas under `features/<domain>/schema/`.
3. Add a mapper/service under `features/<domain>/service/`.
4. Define the tool under `features/<domain>/tools/`.
5. Export it from `features/<domain>/index.ts`.
6. Register it in `src/features/mcp/service/mcp-tool-registry.ts`.
7. Add or update required OAuth scopes only if the tool introduces a new permission boundary.

## Existing Tool Examples

Current tools in this project:

- `posts_list`: list posts with MCP-safe metadata
- `posts_get`: fetch a single post with markdown content
- `posts_create_draft`: create an empty draft post
- `search_posts`: run full-text search through the existing search service

Use them as the reference shape before adding new domains.

## Validation Checklist

- Tool name uses underscores
- Input schema has concise `.describe()`
- Output is JSON-safe
- Scope requirement is minimal and correct
- `bun run typecheck` passes
- Test with MCP Inspector before debugging client-specific behavior
