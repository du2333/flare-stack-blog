import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { GetPostsInput } from "@/features/posts/schema/posts.schema";
import { adminPostsQuery } from "@/features/posts/queries";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import type { PostListLocation } from "../list-position";
import type { AdminPostListItem } from "../types";
import { POSTS_PER_PAGE, statusFilterToApi } from "../types";

export function adminPostsListParams({
  page,
  status,
  sortBy,
  search,
  category,
  tag,
}: PostListLocation): GetPostsInput {
  return {
    offset: (page - 1) * POSTS_PER_PAGE,
    limit: POSTS_PER_PAGE,
    ...statusFilterToApi(status),
    sortDir: "DESC",
    sortBy,
    search: search || undefined,
    categoryId: typeof category === "number" ? category : undefined,
    uncategorized: category === "none" || undefined,
    tagId: tag,
  };
}

export function usePosts(location: PostListLocation) {
  const postsQuery = useQuery({
    ...adminPostsQuery(adminPostsListParams(location)),
    placeholderData: keepPreviousData,
  });

  const totalCount = postsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);

  return {
    posts: postsQuery.data?.items ?? [],
    totalCount,
    totalPages,
    statusCounts: postsQuery.data?.statusCounts,
    popularity: postsQuery.data?.popularity,
    isFetching: postsQuery.isFetching,
    isPlaceholderData: postsQuery.isPlaceholderData,
    refetch: postsQuery.refetch,
    isPending: postsQuery.isPending,
    error: postsQuery.error,
  };
}

/** Refreshes every view of a post after it changes outside the editor's autosave. */
export function invalidatePostQueries(queryClient: QueryClient, id: number) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: orpc.posts.admin.get.key({ input: { id } }),
    }),
    queryClient.invalidateQueries({ queryKey: orpc.posts.admin.list.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.posts.list.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() }),
  ]);
}

interface MutationCallbacks {
  onSuccess?: () => void;
  onError?: () => void;
}

interface UnpublishCallbacks {
  /** The post's `saveToken` after it went back to a draft. */
  onSuccess?: (result: { saveToken: string }) => void;
  onError?: () => void;
}

export function useUnpublishPost({
  onSuccess,
  onError,
}: UnpublishCallbacks = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => orpcClient.posts.admin.unpublish({ id }),
    onSuccess: (result, id) => {
      toast.success(m.editor_toast_unpublished());
      void invalidatePostQueries(queryClient, id);
      onSuccess?.(result);
    },
    onError: () => {
      toast.error(m.editor_action_unpublish_failed());
      onError?.();
    },
  });
}

export function useTogglePostPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      post: Pick<AdminPostListItem, "id" | "pinnedAt" | "status">,
    ) =>
      post.pinnedAt
        ? orpcClient.posts.admin.unpin({ id: post.id })
        : orpcClient.posts.admin.pin({ id: post.id }),
    onSuccess: async (_result, post) => {
      await invalidatePostQueries(queryClient, post.id);
      // Pinning is live at once for a published post; a draft's pin shows
      // when it is published.
      const live = post.status === "published";
      toast.success(
        post.pinnedAt
          ? live
            ? m.admin_posts_toast_unpinned()
            : m.admin_posts_toast_unpinned_draft()
          : live
            ? m.admin_posts_toast_pinned()
            : m.admin_posts_toast_pinned_draft(),
      );
    },
    onError: () => {
      toast.error(m.admin_posts_toast_pin_failed());
    },
  });
}

export function useDeletePost({
  onSuccess,
}: Pick<MutationCallbacks, "onSuccess"> = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: Pick<AdminPostListItem, "id" | "title">) => {
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
