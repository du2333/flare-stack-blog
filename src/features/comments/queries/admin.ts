import { keepPreviousData } from "@tanstack/react-query";
import type { AdminCommentView } from "@/features/comments/comments.schema";
import { orpc } from "@/lib/orpc";

/** Comments per page on the Admin's Comments page. */
export const ADMIN_COMMENTS_PER_PAGE = 20;

export interface AdminCommentsParams {
  view: AdminCommentView;
  page: number;
  search: string;
  postId?: number;
}

/** One page of the Comments page, as its address names it. */
export function adminCommentsQuery({
  view,
  page,
  search,
  postId,
}: AdminCommentsParams) {
  return orpc.comments.admin.list.queryOptions({
    input: {
      view,
      search: search.trim() || undefined,
      postId,
      offset: (page - 1) * ADMIN_COMMENTS_PER_PAGE,
      limit: ADMIN_COMMENTS_PER_PAGE,
    },
    placeholderData: keepPreviousData,
  });
}

export const commentedPostsQuery =
  orpc.comments.admin.commentedPosts.queryOptions();
