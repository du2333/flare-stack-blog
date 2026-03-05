---
name: frontend-development
description: Frontend development patterns for the Flare Stack Blog. Use when implementing data fetching with TanStack Query, creating route loaders, building infinite scroll, adding skeleton/pending states, or organizing UI components.
---

# Frontend Development Patterns

This skill covers TanStack Query patterns, route loaders, component organization, and frontend best practices.

## Data Fetching Architecture

The project follows **TanStack Start / TanStack Query** standard practices for seamless SSR and client-side caching.

### Query/Mutation Error Rules

1. Do not add custom `onError` by default in `useQuery` / `useMutation`; request-level errors are handled by global QueryClient `onError`.
2. Handle business errors in `onSuccess` using `result.error` branches.

```typescript
const mutation = useMutation({
  mutationFn: (input: Parameters<typeof approveFriendLinkFn>[0]) =>
    approveFriendLinkFn(input),
  onSuccess: (result) => {
    if (result.error) {
      switch (result.error.reason) {
        case "FRIEND_LINK_NOT_FOUND":
          toast.error("操作失败: 友链不存在");
          return;
        default:
          result.error.reason satisfies never;
          return;
      }
    }
    toast.success("友链已批准");
  },
});
```

### 1. Query Definition

Organize query definitions in `features/<name>/queries/index.ts`. Use a **Query Key Factory** pattern to centralize and type-safe your cache keys.

```typescript
// features/posts/queries/index.ts
import { queryOptions, infiniteQueryOptions } from "@tanstack/react-query";
import { findPostBySlugFn, getPostsFn } from "../api/posts.api";

// 1. Define Query Key Factory (static arrays + functions)
export const POSTS_KEYS = {
  all: ["posts"] as const,

  // Parent keys (static arrays for prefix invalidation)
  lists: ["posts", "list"] as const,
  details: ["posts", "detail"] as const,
  adminLists: ["posts", "admin-list"] as const,

  // Child keys (functions for specific queries)
  list: (filters?: { tagName?: string }) =>
    ["posts", "list", filters] as const,
  detail: (idOrSlug: number | string) =>
    ["posts", "detail", idOrSlug] as const,
  adminList: (params: GetPostsInput) =>
    ["posts", "admin-list", params] as const,
};

// 2. Define Query Options
export function postBySlugQuery(slug: string) {
  return queryOptions({
    queryKey: POSTS_KEYS.detail(slug),
    queryFn: () => findPostBySlugFn({ data: { slug } }),
  });
}

export function postsInfiniteQuery(tag?: string) {
  return infiniteQueryOptions({
    queryKey: POSTS_KEYS.list({ tagName: tag }),
    queryFn: ({ pageParam }) =>
      getPostsFn({ data: { cursor: pageParam, tag } }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });
}
```

**Key Pattern:**
- **Parent keys** are static arrays (no `()`) — used for prefix-based cache invalidation
- **Child keys** are functions — used for specific queries with parameters

```typescript
// Invalidation (no parentheses - static reference)
queryClient.invalidateQueries({ queryKey: POSTS_KEYS.adminLists });

// Query (with parentheses - function call)
useQuery({ queryKey: POSTS_KEYS.detail(postId) });
```

### 2. Route Loader (`routes/<path>.tsx`)

Use loader functions with `ensureQueryData()` or `prefetchQuery()` for SSR:

```typescript
// $slug.tsx
export const Route = createFileRoute("/_public/post/$slug")({
  loader: async ({ context, params }) => {
    const post = await context.queryClient.ensureQueryData(
      postBySlugQuery(params.slug),
    );
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData: post }) => ({
    meta: [{ title: post?.title }],
  }),
  component: PostPage,
});
```

**Key Points**:

- `ensureQueryData()`: Fetches and caches if not present
- `prefetchQuery()` / `prefetchInfiniteQuery()`: For background prefetching
- `loaderData`: Available in `head` function for dynamic SEO

### 3. Component Data Access

Two patterns for data fetching in components:

#### SSR with Loader (Recommended for page-level data)

When loader uses `ensureQueryData` or `prefetchQuery`, use `useSuspenseQuery` in the component. Data is already cached, so render is synchronous:

```typescript
// Route loader (server-side)
export const Route = createFileRoute("/_public/post/$slug")({
  loader: async ({ context, params }) => {
    const post = await context.queryClient.ensureQueryData(
      postBySlugQuery(params.slug)
    );
    if (!post) throw notFound();
    return post;
  },
  component: PostPage,
});

// Component (client-side, data already cached)
function PostPage() {
  const { slug } = Route.useParams();
  const { data: post } = useSuspenseQuery(postBySlugQuery(slug)); // Synchronous!

  return <article>{post.content}</article>;
}
```

#### Client-side Only (for secondary/independent data)

Use `useQuery` for data not critical to initial render:

```typescript
function RelatedPosts({ slug }: { slug: string }) {
  const { data, isLoading } = useQuery(relatedPostsQuery(slug));

  if (isLoading) return <LoadingSpinner />;
  return <PostList posts={data} />;
}
```

**When to use each:**
| Pattern | Hook | Use Case |
|---------|------|----------|
| SSR with loader | `useSuspenseQuery` | Page primary content, SEO-critical data |
| Client-side | `useQuery` | Secondary content, user interactions, polling |

### 4. Infinite Scroll Pattern

Use `IntersectionObserver` to observe a bottom sentinel element:

```typescript
function PostList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(postsInfiniteQuery());

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      {data.pages.flatMap((page) => page.posts.map((post) => (
        <PostCard key={post.id} post={post} />
      )))}

      <div ref={sentinelRef} className="h-4" />
      {isFetchingNextPage && <LoadingSpinner />}
    </>
  );
}
```

## Skeleton / Pending States

Define `pendingComponent` for critical routes to show skeletons during client navigation:

```typescript
export const Route = createFileRoute("/_public/post/$slug")({
  pendingComponent: PostSkeleton,
  // ...
});

function PostSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-muted rounded w-3/4 mb-4" />
      <div className="h-4 bg-muted rounded w-full mb-2" />
      <div className="h-4 bg-muted rounded w-5/6" />
    </div>
  );
}
```

## Component Organization

### `src/components/` Directory

| Subdirectory | Purpose                                                             |
| :----------- | :------------------------------------------------------------------ |
| `ui/`        | Atomic UI components (Button, Input, Card). Use `cva` for variants. |
| `common/`    | Shared business components (ThemeProvider, LoadingFallback)         |
| `layout/`    | Layout components (Header, Footer, Sidebar)                         |

### Feature Components

Components specific to a feature belong in `features/<name>/components/`.

## Custom Hooks (`src/hooks/`)

Reusable hooks for cross-feature functionality:

| Hook                   | Purpose                        |
| :--------------------- | :----------------------------- |
| `use-debounce.ts`           | Generic debouncing             |
| `use-media-query.ts`        | Responsive media queries       |
| `use-navigate-back.ts`      | Navigation with fallback       |
| `use-active-toc.ts`         | Table of contents active state |
| `use-delay-unmount.ts`      | Delayed unmount for exit animations |
| `use-previous-location.ts`  | Track previous route location  |

## Mutation Hook Conventions

Mutation hooks live in `features/<name>/hooks/` and follow these patterns:

### Type Inference

Use `Parameters<typeof xxxFn>[0]` to infer server function input types — no need to import/export separate input types:

```typescript
const mutation = useMutation({
  mutationFn: async (input: Parameters<typeof deleteTagFn>[0]) => {
    return await deleteTagFn(input);
  },
  // ...
});
```

### `mutate` vs `mutateAsync` Exposure

Hooks should choose what to expose based on calling context:

| Scenario | Expose | Reason |
| :--- | :--- | :--- |
| Simple fire-and-forget (e.g. admin approve) | `mutate` only | Avoids floating promises |
| Caller needs to `await` (e.g. form submit then close modal) | `mutateAsync` only | Sequential logic required |
| Used in both contexts (e.g. single + batch operations) | Both `mutate` and `mutateAsync` | Flexibility for callers |

```typescript
// Hook return example
return {
  approve: approveMutation.mutate,       // simple use
  approveAsync: approveMutation.mutateAsync, // batch use
  isApproving: approveMutation.isPending,
};
```

### Public / Admin Hook Split

For features with distinct user roles, split hooks (matching the API split):

```typescript
// hooks/use-friend-links.ts
export function useFriendLinks() { ... }      // Regular user actions
export function useAdminFriendLinks() { ... } // Admin-only actions
```

## Naming Conventions

| Type                  | Convention       | Example                            |
| :-------------------- | :--------------- | :--------------------------------- |
| Components & Hooks    | kebab-case files | `post-item.tsx`, `use-debounce.ts` |
| React Components      | PascalCase       | `PostItem`                         |
| Variables & Functions | camelCase        | `getPosts`                         |
| Types & Interfaces    | PascalCase       | `PostItemProps`                    |
