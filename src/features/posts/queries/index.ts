import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type {
  GetPostsCountInput,
  GetPostsInput,
} from "@/features/posts/schema/posts.schema";
import {
  PostItemSchema,
  PostListResponseSchema,
  PostWithTocSchema,
} from "@/features/posts/schema/posts.schema";
import { apiClient } from "@/lib/api-client";
import { isSSR } from "@/lib/utils";
import {
  getPostRevisionFn,
  listPostRevisionsFn,
} from "../api/post-revisions.admin.api";
import { findPostByIdFn } from "../api/posts.admin.api";
import {
  findPostBySlugFn,
  getPinnedPostsFn,
  getPopularPostsFn,
  getPostsCursorFn,
  getRelatedPostsFn,
} from "../api/posts.public.api";

export const POSTS_KEYS = {
  all: ["posts"] as const,

  // Parent keys (static arrays for prefix invalidation)
  pinned: ["posts", "pinned"] as const,
  lists: ["posts", "list"] as const,
  details: ["posts", "detail"] as const,
  recent: ["posts", "recent"] as const,
  popular: ["posts", "popular"] as const,
  adminLists: ["posts", "admin-list"] as const,
  counts: ["posts", "count"] as const,
  revisions: ["posts", "revisions"] as const,
  revisionDetails: ["posts", "revision-detail"] as const,

  // Child keys (functions for specific queries)
  list: (filters?: { tagName?: string }) => ["posts", "list", filters] as const,
  detail: (idOrSlug: number | string) => ["posts", "detail", idOrSlug] as const,
  related: (slug: string, limit?: number) =>
    ["posts", "related", slug, limit] as const,
  adminList: (params: GetPostsInput) =>
    ["posts", "admin-list", params] as const,
  count: (params: GetPostsCountInput) => ["posts", "count", params] as const,
  revisionList: (postId: number) => ["posts", "revisions", postId] as const,
  revisionDetail: (postId: number, revisionId: number) =>
    ["posts", "revision-detail", postId, revisionId] as const,
};

export function recentPostsQuery(limit: number) {
  return queryOptions({
    queryKey: [...POSTS_KEYS.recent, limit],
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
      const json = await res.json();
      const result = PostItemSchema.array().safeParse(json);
      if (!result.success) {
        console.error(
          JSON.stringify({
            message: "related posts response parse failed",
            error: result.error.message,
            received: typeof json,
          }),
        );
        return [];
      }
      return result.data;
    },
  });
}

export function postRevisionListQuery(postId: number) {
  return queryOptions({
    queryKey: POSTS_KEYS.revisionList(postId),
    queryFn: () => listPostRevisionsFn({ data: { postId } }),
  });
}

export function postRevisionDetailQuery(postId: number, revisionId: number) {
  return queryOptions({
    queryKey: POSTS_KEYS.revisionDetail(postId, revisionId),
    queryFn: async () =>
      (await getPostRevisionFn({ data: { postId, revisionId } })) ?? null,
  });
}

export const pinnedPostsQuery = queryOptions({
  queryKey: POSTS_KEYS.pinned,
  queryFn: () => getPinnedPostsFn(),
});

export function popularPostsQuery(limit?: number) {
  return queryOptions({
    queryKey: [...POSTS_KEYS.popular, limit],
    queryFn: () => getPopularPostsFn({ data: { limit } }),
  });
}
