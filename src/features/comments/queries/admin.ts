import { keepPreviousData } from "@tanstack/react-query";
import {
  ADMIN_COMMENTS_PAGE_SIZE,
  type AdminCommentView,
} from "@/features/comments/comments.schema";
import { orpc } from "@/lib/orpc";

export interface AdminCommentsParams {
  view: AdminCommentView;
  page: number;
  search: string;
  postId?: number;
}

/**
 * One page of the Comments page, as its address names it. Only the 全部 view
 * has a search and a Post filter, so the unreplied one sends neither.
 */
export function adminCommentsQuery({
  view,
  page,
  search,
  postId,
}: AdminCommentsParams) {
  return orpc.comments.admin.list.queryOptions({
    input: {
      view,
      search: view === "all" ? search.trim() || undefined : undefined,
      postId: view === "all" ? postId : undefined,
      offset: (page - 1) * ADMIN_COMMENTS_PAGE_SIZE,
      limit: ADMIN_COMMENTS_PAGE_SIZE,
    },
    placeholderData: keepPreviousData,
  });
}

export const commentedPostsQuery =
  orpc.comments.admin.commentedPosts.queryOptions();
