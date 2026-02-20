import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { findPostByIdFn } from "../api/posts.admin.api";
import {
  findPostBySlugFn,
  getPostsCursorFn,
  getRelatedPostsFn,
} from "../api/posts.public.api";
import type {
  GetPostsCountInput,
  GetPostsInput,
} from "@/features/posts/posts.schema";
import {
  PostItemSchema,
  PostListResponseSchema,
  PostWithTocSchema,
} from "@/features/posts/posts.schema";
import { apiClient } from "@/lib/api-client";
import { isSSR } from "@/lib/utils";

export const POSTS_KEYS = {
  all: ["posts"] as const,

  // Parent keys (static arrays for prefix invalidation)
  lists: ["posts", "list"] as const,
  details: ["posts", "detail"] as const,
  featured: ["posts", "featured"] as const,
  adminLists: ["posts", "admin-list"] as const,
  counts: ["posts", "count"] as const,

  // Child keys (functions for specific queries)
  list: (filters?: { tagName?: string }) => ["posts", "list", filters] as const,
  detail: (idOrSlug: number | string) => ["posts", "detail", idOrSlug] as const,
  related: (slug: string, limit?: number) =>
    ["posts", "related", slug, limit] as const,
  adminList: (params: GetPostsInput) =>
    ["posts", "admin-list", params] as const,
  count: (params: GetPostsCountInput) => ["posts", "count", params] as const,
};

export function featuredPostsQuery(limit: number) {
  return queryOptions({
    queryKey: [...POSTS_KEYS.featured, limit],
    queryFn: async () => {
      if (isSSR) {
        const result = await getPostsCursorFn({ data: { limit } });
        return result.items;
      }
      const res = await apiClient.posts.$get({
        query: { limit: String(limit) },
      });
      if (!res.ok) throw new Error("Failed to fetch posts");
      return PostListResponseSchema.parse(await res.json()).items;
    },
  });
}

export function postsInfiniteQueryOptions(
  filters: { tagName?: string; limit?: number } = {},
) {
  const pageSize = filters.limit ?? 12;
  return infiniteQueryOptions({
    queryKey: POSTS_KEYS.list(filters),
    queryFn: async ({ pageParam }) => {
      if (isSSR) {
        return await getPostsCursorFn({
          data: {
            cursor: pageParam,
            limit: pageSize,
            tagName: filters.tagName,
          },
        });
      }
      const res = await apiClient.posts.$get({
        query: {
          cursor: pageParam?.toString(),
          limit: String(pageSize),
          tagName: filters.tagName,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch posts");
      return PostListResponseSchema.parse(await res.json());
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as number | undefined,
  });
}

export function postBySlugQuery(slug: string) {
  return queryOptions({
    queryKey: POSTS_KEYS.detail(slug),
    queryFn: async () => {
      if (isSSR) {
        return await findPostBySlugFn({ data: { slug } });
      }
      const res = await apiClient.post[":slug"].$get({ param: { slug } });
      if (!res.ok) throw new Error("Failed to fetch post");
      return PostWithTocSchema.parse(await res.json());
    },
  });
}

export function postByIdQuery(id: number) {
  return queryOptions({
    queryKey: POSTS_KEYS.detail(id),
    queryFn: () => findPostByIdFn({ data: { id } }),
  });
}

export function relatedPostsQuery(slug: string, limit?: number) {
  return queryOptions({
    queryKey: POSTS_KEYS.related(slug, limit),
    queryFn: async () => {
      if (isSSR) {
        return await getRelatedPostsFn({ data: { slug, limit } });
      }
      const res = await apiClient.post[":slug"].related.$get({
        param: { slug },
        query: { limit: limit != null ? String(limit) : undefined },
      });
      if (!res.ok) throw new Error("Failed to fetch related posts");
      return PostItemSchema.array().parse(await res.json());
    },
  });
}
