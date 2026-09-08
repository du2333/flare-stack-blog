import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { GetPostsInput } from "@/features/posts/schema/posts.schema";
import { adminPostsQuery } from "@/features/posts/queries";
import { orpc, orpcClient } from "@/lib/orpc";
import { ADMIN_ITEMS_PER_PAGE } from "@/lib/constants";
import { m } from "@/paraglide/messages";
import type { PostListItem, SortField, StatusFilter } from "../types";
import { statusFilterToApi } from "../types";

interface UsePostsOptions {
  page: number;
  status: StatusFilter;
  sortBy: SortField;
  search: string;
}

export function adminPostsListParams({
  page,
  status,
  sortBy,
  search,
}: UsePostsOptions): GetPostsInput {
  return {
    offset: (page - 1) * ADMIN_ITEMS_PER_PAGE,
    limit: ADMIN_ITEMS_PER_PAGE,
    status: statusFilterToApi(status),
    sortDir: "DESC",
    sortBy,
    search: search || undefined,
  };
}

export function usePosts({ page, status, sortBy, search }: UsePostsOptions) {
  const postsQuery = useQuery({
    ...adminPostsQuery(adminPostsListParams({ page, status, sortBy, search })),
    placeholderData: keepPreviousData,
  });

  const totalCount = postsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(totalCount / ADMIN_ITEMS_PER_PAGE);

  return {
    posts: postsQuery.data?.items ?? [],
    totalCount,
    totalPages,
    statusCounts: postsQuery.data?.statusCounts,
    isFetching: postsQuery.isFetching,
    isPlaceholderData: postsQuery.isPlaceholderData,
    refetch: postsQuery.refetch,
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
      await orpcClient.posts.admin.remove({ id: post.id });
      return post;
    },
    onSuccess: async (post) => {
      await queryClient.invalidateQueries({
        queryKey: orpc.posts.admin.list.key(),
      });
      toast.success(m.admin_posts_toast_delete_success(), {
        description: m.admin_posts_toast_delete_success_desc({
          title: post.title,
        }),
      });
      onSuccess?.();
    },
    onError: (_error, post) => {
      toast.error(m.admin_posts_toast_delete_failed(), {
        description: m.admin_posts_toast_delete_failed_desc({
          title: post.title,
        }),
      });
    },
  });
}
