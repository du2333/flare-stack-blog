import type { CommentStatus } from "@/lib/db/schema";
import { orpc } from "@/lib/orpc";
import { COMMENT_PAGE_SIZE } from "../comment-thread";

export function rootCommentsByPostIdQuery(postId: number) {
  return orpc.comments.roots.queryOptions({ input: { postId } });
}

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

export function myCommentsQuery(
  options: { offset?: number; limit?: number; status?: CommentStatus } = {},
) {
  return orpc.comments.mine.queryOptions({ input: options });
}
