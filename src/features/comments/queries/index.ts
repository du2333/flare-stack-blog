import { orpc } from "@/lib/orpc";
import { COMMENT_PAGE_SIZE } from "../comment-thread";

export function rootCommentsByPostIdInfiniteQuery(postId: number) {
  return orpc.comments.roots.infiniteOptions({
    input: (pageParam: number) => ({
      postId,
      offset: pageParam,
      limit: COMMENT_PAGE_SIZE,
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.items.length < COMMENT_PAGE_SIZE) {
        return undefined;
      }
      return lastPageParam + lastPage.items.length;
    },
  });
}

export function repliesByRootIdInfiniteQuery(postId: number, rootId: number) {
  return orpc.comments.replies.infiniteOptions({
    input: (pageParam: number) => ({
      postId,
      rootId,
      offset: pageParam,
      limit: COMMENT_PAGE_SIZE,
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.items.length < COMMENT_PAGE_SIZE) {
        return undefined;
      }
      const totalLoaded = allPages.reduce(
        (sum, page) => sum + page.items.length,
        0,
      );
      return totalLoaded;
    },
  });
}

export function commentThreadQuery(postId: number, commentId: number) {
  return orpc.comments.thread.queryOptions({
    input: { postId, id: commentId },
  });
}
