import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deletePostFn,
  getPostsCountFn,
  getPostsFn,
} from "@/features/posts/api/posts.admin.api";
import { POSTS_KEYS } from "@/features/posts/queries";
import { ADMIN_ITEMS_PER_PAGE } from "@/lib/constants";
import { m } from "@/paraglide/messages";
import type {
  PostListItem,
  SortDirection,
  SortField,
  StatusFilter,
} from "../types";
import { statusFilterToApi } from "../types";

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
    mutationFn: async (post: PostListItem) => {
      return {
        post,
        result: await deletePostFn({ data: { id: post.id } }),
      };
    },
    onSuccess: ({ post, result }) => {
      if (result.error) {
        toast.error(m.admin_posts_toast_delete_failed(), {
          description: m.admin_posts_toast_delete_failed_desc({
            title: post.title,
          }),
        });
        return;
      }

      queryClient.invalidateQueries({ queryKey: POSTS_KEYS.adminLists });
      queryClient.invalidateQueries({ queryKey: POSTS_KEYS.counts });
      toast.success(m.admin_posts_toast_delete_success(), {
        description: m.admin_posts_toast_delete_success_desc({
          title: post.title,
        }),
      });
      onSuccess?.();
    },
  });
}
