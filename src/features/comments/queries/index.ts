import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { CommentStatus } from "@/lib/db/schema";
import { getAllCommentsFn } from "../api/comments.admin.api";
import {
  getMyCommentsFn,
  getRepliesByRootIdFn,
  getRootCommentsByPostIdFn,
} from "../api/comments.public.api";

export const COMMENTS_KEYS = {
  all: ["comments"] as const,

  // Parent keys (static arrays for prefix invalidation)
  mine: ["comments", "mine"] as const,
  admin: ["comments", "admin"] as const,

  // Child keys (functions for specific queries)
  roots: (postId: number) => ["comments", "roots", postId] as const,
  replies: (postId: number, rootId: number) =>
    ["comments", "replies", postId, rootId] as const,
  repliesLists: (postId: number) => ["comments", "replies", postId] as const,
  userStats: (userId: string) =>
    ["comments", "admin", "user-stats", userId] as const,
};

export function rootCommentsByPostIdQuery(postId: number, userId?: string) {
  return queryOptions({
    queryKey: [...COMMENTS_KEYS.roots(postId), { userId }],
    queryFn: () => getRootCommentsByPostIdFn({ data: { postId } }),
  });
}

export function rootCommentsByPostIdInfiniteQuery(
  postId: number,
  userId?: string,
) {
  return infiniteQueryOptions({
    queryKey: [...COMMENTS_KEYS.roots(postId), "infinite", { userId }],
    queryFn: ({ pageParam = 0 }) =>
      getRootCommentsByPostIdFn({
        data: { postId, offset: pageParam, limit: 20 },
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce(
        (sum, page) => sum + page.items.length,
        0,
      );
      return totalLoaded < lastPage.total ? totalLoaded : undefined;
    },
  });
}

export function repliesByRootIdInfiniteQuery(
  postId: number,
  rootId: number,
  userId?: string,
) {
  return infiniteQueryOptions({
    queryKey: [...COMMENTS_KEYS.replies(postId, rootId), { userId }],
    queryFn: ({ pageParam = 0 }) =>
      getRepliesByRootIdFn({
        data: { postId, rootId, offset: pageParam, limit: 20 },
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce(
        (sum, page) => sum + page.items.length,
        0,
      );
      return totalLoaded < lastPage.total ? totalLoaded : undefined;
    },
  });
}

export function myCommentsQuery(
  options: { offset?: number; limit?: number; status?: CommentStatus } = {},
) {
  return queryOptions({
    queryKey: [...COMMENTS_KEYS.mine, options],
    queryFn: () => getMyCommentsFn({ data: options }),
  });
}

export function allCommentsQuery(
  options: {
    offset?: number;
    limit?: number;
    status?: CommentStatus;
    postId?: number;
    userId?: string;
    userName?: string;
  } = {},
) {
  return queryOptions({
    queryKey: [...COMMENTS_KEYS.admin, options],
    queryFn: () => getAllCommentsFn({ data: options }),
  });
}
