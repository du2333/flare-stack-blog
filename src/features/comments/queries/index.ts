import type { CommentStatus } from "@/lib/db/schema";
import { orpc } from "@/lib/orpc";

export function rootCommentsByPostIdQuery(postId: number) {
  return orpc.comments.roots.queryOptions({ input: { postId } });
}

export function rootCommentsByPostIdInfiniteQuery(postId: number) {
  return orpc.comments.roots.infiniteOptions({
    input: (pageParam: number) => ({
      postId,
      offset: pageParam,
      limit: 20,
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

export function repliesByRootIdInfiniteQuery(postId: number, rootId: number) {
  return orpc.comments.replies.infiniteOptions({
    input: (pageParam: number) => ({
      postId,
      rootId,
      offset: pageParam,
      limit: 20,
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
  return orpc.comments.mine.queryOptions({ input: options });
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
  return orpc.comments.admin.list.queryOptions({ input: options });
}

export function userCommentStatsQuery(userId: string) {
  return orpc.comments.admin.userStats.queryOptions({
    input: { userId },
    staleTime: 1000 * 60 * 5,
  });
}
