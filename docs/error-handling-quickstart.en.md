# Error Handling and Result Pattern Quickstart

This document is intended to unify the error handling logic within the project, helping contributors quickly decide whether to "return a `Result` or `throw` directly."

## One-Line Rules

1. `Result` is only for handling business errors (expected, recoverable, requiring UI prompts or branch logic).
2. Request-level errors (authentication, permissions, rate limiting, Turnstile verification) are thrown directly by middlewares (this refers to TanStack Start / ServerFn middlewares; `Hono /api` is an independent HTTP channel and doesn't follow this `Result` convention).
3. Services without business errors should return `T` directly, do not wrap it in `ok(...)`.
4. Let TypeScript infer return types by default, explicitly annotate "lock types" only when necessary at public boundaries.

## Layered Responsibilities

### `middleware`

1. Handles request-level issues: `UNAUTHENTICATED`, `PERMISSION_DENIED`, `RATE_LIMITED`, `TURNSTILE_FAILED`.
2. Throws serializable errors using `createXxxError` (located in `src/lib/errors/request-errors.ts`).

### `service`

1. Handles business rules and business errors, e.g., `POST_NOT_FOUND`, `MEDIA_IN_USE`, `TAG_NOT_FOUND`.
2. Returns `Result<T, { reason: ... }>` when there is a business error.
3. Returns pure data `T` when there is no business error.

### `api` (server function)

1. Keep it as a thin forwarding layer: auth and rate limiting are handled by middlewaares, business logic is passed to the service.
2. Do not re-wrap `ok(...)` at the API layer (unless the API itself indeed has independent business error branches).

### `client` (TanStack Query)

1. `query/mutation` should by default not write custom `onError`, request-level errors are handled uniformly by the global `onError`: `src/lib/errors/error-handler.ts`.
2. Business errors are handled uniformly within `onSuccess` under the `result.error.reason` branch.

## When to use Result

Typical scenarios for using `Result`:

1. Resource not found: `POST_NOT_FOUND`, `COMMENT_NOT_FOUND`.
2. State conflicts: `MEDIA_IN_USE`, `TAG_IN_USE`.
3. Business preconditions not met: `EMAIL_DISABLED`, `INVALID_PROGRESS_DATA`.

Scenarios where `Result` is NOT used:

1. Pure queries/writes where there are no business failure branches, failures can only be system exceptions.
2. Request-level failures (auth, perms, rate limits) which are already handled by middlewares.

## Full-Chain Example

### 1) Middleware: Throwing request-level errors

```ts
// src/lib/middlewares.ts
if (!context.session) {
  throw createAuthError();
}
if (context.session.user.role !== "admin") {
  throw createPermissionError();
}
```

### 2) Service: Returning only business errors

```ts
// src/features/tags/tags.service.ts
import { err, ok } from "@/lib/errors";

export async function deleteTag(id: string) {
  const found = await repo.findById(id);
  if (!found) return err({ reason: "TAG_NOT_FOUND" });

  await repo.remove(id);
  return ok(undefined);
}

// No business errors: return T directly
export async function listTags() {
  return repo.listAll();
}
```

If you wish to fix type boundaries for public consumption, then explicitly annotate `Promise<Result<...>>`.

### 3) API: Thin Forwarding

```ts
// src/features/tags/api/tags.admin.api.ts
export const deleteTagFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware]) // Request-level errors thrown by middleware
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    return TagService.deleteTag(data.id); // Business errors passed forward as Result
  });
```

### 4) Query: Returning data directly when no business errors exist

```ts
// src/features/tags/queries/index.ts
export function tagsQuery() {
  return queryOptions({
    queryKey: TAGS_KEYS.all,
    queryFn: async () => {
      return getTagsFn(); // getTagsFn returns Tag[], not Result
    },
  });
}
```

### 5) Mutation: Handling business errors centrally in the hook

```ts
// src/features/tags/hooks/use-tags.ts
export function useDeleteTag() {
  return useMutation({
    mutationFn: (id: string) => deleteTagFn({ data: { id } }),
    onSuccess: (result) => {
      if (result.error) {
        switch (result.error.reason) {
          case "TAG_NOT_FOUND":
            toast.error("Tag not found or already deleted");
            return;
          default:
            result.error.reason satisfies never;
            return;
        }
      }

      toast.success("Tag deleted");
    },
  });
}
```

### 6) Global Request Error Handling (TanStack Query)

```ts
// src/integrations/tanstack-query/root-provider.tsx
const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleServerError }),
  mutationCache: new MutationCache({ onError: handleServerError }),
});
```

```ts
// src/lib/errors/error-handler.ts
export function handleServerError(error: unknown) {
  const parsed = parseRequestError(error);
  const { code } = parsed;

  switch (code) {
    case "UNAUTHENTICATED":
      window.location.href = "/login";
      return;
    case "PERMISSION_DENIED":
      toast.error("Insufficient permissions");
      return;
    case "RATE_LIMITED":
      toast.warning("Too many requests");
      return;
    case "TURNSTILE_FAILED":
      toast.error(parsed.message);
      return;
    case "UNKNOWN":
      toast.error("Request failed");
      return;
    default:
      code satisfies never;
  }
}
```

### 7) `handleServerError` must perform exhaustive checks

1. In the `switch`, explicitly list each request error `code`.
2. The `default` branch should only retain `code satisfies never`, do not add a fallback toast.
3. After adding a new member to the `request-errors` union, TypeScript must immediately throw an error if this is not updated.

## What to change when adding a new request error

1. Add the new `code` and fields to the zod union in `src/lib/errors/request-errors.ts`.
2. Add the corresponding `createXxxError` constructor function.
3. Add a frontend handling branch for that `code` in `src/lib/errors/error-handler.ts`.
4. Add tests: at minimum, cover serialization/deserialization and frontend behavior.

## PR Self-Checklist

1. Did you mistakenly write a request-level error as a `Result`?
2. Did you mistakenly `throw` a business error?
3. Are services without business errors still returning `ok(data)`?
4. Is the Query swallowing business errors (e.g., directly returning an empty array), leaving the user unaware?
