import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { statusFilterToApi } from "../types";
import type {
  PostListItem,
  SortDirection,
  SortField,
  StatusFilter,
} from "../types";
import {
  deletePostFn,
  getPostsCountFn,
  getPostsFn,
  startPostProcessWorkflowFn,
  updatePostFn,
} from "@/features/posts/api/posts.admin.api";

import { ADMIN_ITEMS_PER_PAGE } from "@/lib/constants";
import { POSTS_KEYS } from "@/features/posts/queries";
import { toLocalDateString } from "@/lib/utils";

interface UsePostsOptions {
  page: number;
  status: StatusFilter;
  sortDir: SortDirection;
  sortBy: SortField;
  search: string;
}

export function usePosts({
  page,
  status,
  sortDir,
  sortBy,
  search,
}: UsePostsOptions) {
  const apiStatus = statusFilterToApi(status);

  const listParams = {
    offset: (page - 1) * ADMIN_ITEMS_PER_PAGE,
    limit: ADMIN_ITEMS_PER_PAGE,
    status: apiStatus,
    sortDir,
    sortBy,
    search: search || undefined,
  };

  const countParams = {
    status: apiStatus,
    search: search || undefined,
  };

  const postsQuery = useQuery({
    queryKey: POSTS_KEYS.adminList(listParams),
    queryFn: () => getPostsFn({ data: listParams }),
  });

  const countQuery = useQuery({
    queryKey: POSTS_KEYS.count(countParams),
    queryFn: () => getPostsCountFn({ data: countParams }),
  });

  const totalPages = Math.ceil((countQuery.data ?? 0) / ADMIN_ITEMS_PER_PAGE);

  return {
    posts: postsQuery.data ?? [],
    totalCount: countQuery.data ?? 0,
    totalPages,
    isPending: postsQuery.isPending,
    error: postsQuery.error,
  };
}

interface UseDeletePostOptions {
  onSuccess?: () => void;
}

export function useDeletePost({ onSuccess }: UseDeletePostOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (post: PostListItem) => deletePostFn({ data: { id: post.id } }),
    onSuccess: (_data, post) => {
      queryClient.invalidateQueries({ queryKey: POSTS_KEYS.adminLists });
      queryClient.invalidateQueries({ queryKey: POSTS_KEYS.counts });
      toast.success("条目已删除", {
        description: `条目 "${post.title}" 已删除成功`,
      });
      onSuccess?.();
    },
    onError: (_error, post) => {
      toast.error("删除条目失败", {
        description: `删除条目 "${post.title}" 失败`,
      });
    },
  });
}

interface UseUnpublishPostOptions {
  onSuccess?: () => void;
}

export function useUnpublishPost({ onSuccess }: UseUnpublishPostOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: PostListItem) => {
      // 1. 将状态改为 draft
      await updatePostFn({ data: { id: post.id, data: { status: "draft" } } });
      // 2. 触发下架工作流
      const clientToday = toLocalDateString(new Date());
      await startPostProcessWorkflowFn({
        data: { id: post.id, status: "draft", clientToday },
      });
    },
    onSuccess: (_data, post) => {
      queryClient.invalidateQueries({ queryKey: POSTS_KEYS.adminLists });
      queryClient.invalidateQueries({ queryKey: POSTS_KEYS.counts });
      toast.success("文章已下架", {
        description: `"${post.title}" 已从前台移除`,
      });
      onSuccess?.();
    },
    onError: (_error, post) => {
      toast.error("下架失败", {
        description: `"${post.title}" 下架失败，请重试`,
      });
    },
  });
}
