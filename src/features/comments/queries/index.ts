import { ORPCError } from "@orpc/client";
import { orpc } from "@/lib/orpc";
import type { CommentTarget } from "../comment-target";
import { COMMENT_PAGE_SIZE } from "../comment-thread";

function rootsNextPage(
  lastPage: { items: Array<unknown> },
  _allPages: unknown,
  lastPageParam: number,
) {
  if (lastPage.items.length < COMMENT_PAGE_SIZE) {
    return undefined;
  }
  return lastPageParam + lastPage.items.length;
}

function repliesNextPage(
  lastPage: { items: Array<unknown> },
  allPages: Array<{ items: Array<unknown> }>,
) {
  if (lastPage.items.length < COMMENT_PAGE_SIZE) {
    return undefined;
  }
  return allPages.reduce((sum, page) => sum + page.items.length, 0);
}

/** A Post's Root Comments, or a Moment's: the same pages from either path. */
export function rootCommentsInfiniteQuery(target: CommentTarget) {
  const paging = (pageParam: number) => ({
    offset: pageParam,
    limit: COMMENT_PAGE_SIZE,
  });
  if (target.type === "moment") {
    return orpc.comments.moment.roots.infiniteOptions({
      input: (pageParam: number) => ({
        momentId: target.id,
        ...paging(pageParam),
      }),
      initialPageParam: 0,
      getNextPageParam: rootsNextPage,
    });
  }
  return orpc.comments.roots.infiniteOptions({
    input: (pageParam: number) => ({
      postId: target.id,
      ...paging(pageParam),
    }),
    initialPageParam: 0,
    getNextPageParam: rootsNextPage,
  });
}

export function repliesByRootIdInfiniteQuery(
  target: CommentTarget,
  rootId: number,
) {
  const paging = (pageParam: number) => ({
    rootId,
    offset: pageParam,
    limit: COMMENT_PAGE_SIZE,
  });
  if (target.type === "moment") {
    return orpc.comments.moment.replies.infiniteOptions({
      input: (pageParam: number) => ({
        momentId: target.id,
        ...paging(pageParam),
      }),
      initialPageParam: 0,
      getNextPageParam: repliesNextPage,
    });
  }
  return orpc.comments.replies.infiniteOptions({
    input: (pageParam: number) => ({
      postId: target.id,
      ...paging(pageParam),
    }),
    initialPageParam: 0,
    getNextPageParam: repliesNextPage,
  });
}

/** A 4xx answer (a missing comment) is final; only server or network faults are retried. */
function retryUnlessRefused(failureCount: number, error: unknown) {
  if (error instanceof ORPCError && error.status < 500) return false;
  return failureCount < 3;
}

export function commentThreadQuery(target: CommentTarget, commentId: number) {
  if (target.type === "moment") {
    return orpc.comments.moment.thread.queryOptions({
      input: { momentId: target.id, id: commentId },
      retry: retryUnlessRefused,
    });
  }
  return orpc.comments.thread.queryOptions({
    input: { postId: target.id, id: commentId },
    retry: retryUnlessRefused,
  });
}

/** How many replies the Admin's conversation view reads of one thread. */
export const ADMIN_THREAD_REPLY_LIMIT = 100;

/**
 * A thread's replies in one read, oldest first, for the Admin's conversation
 * view; a longer thread is cut at ADMIN_THREAD_REPLY_LIMIT.
 */
export function threadRepliesQuery(target: CommentTarget, rootId: number) {
  const page = { rootId, offset: 0, limit: ADMIN_THREAD_REPLY_LIMIT };
  if (target.type === "moment") {
    return orpc.comments.moment.replies.queryOptions({
      input: { momentId: target.id, ...page },
      retry: retryUnlessRefused,
    });
  }
  return orpc.comments.replies.queryOptions({
    input: { postId: target.id, ...page },
    retry: retryUnlessRefused,
  });
}

/**
 * Every cached read of one target's Comments (roots, replies, threads), for
 * the mutations that change them.
 */
export function commentViewKeys(target: CommentTarget) {
  if (target.type === "moment") {
    const input = { momentId: target.id };
    return [
      orpc.comments.moment.roots.key({ input }),
      orpc.comments.moment.replies.key({ input }),
      orpc.comments.moment.thread.key({ input }),
    ];
  }
  const input = { postId: target.id };
  return [
    orpc.comments.roots.key({ input }),
    orpc.comments.replies.key({ input }),
    orpc.comments.thread.key({ input }),
  ];
}
