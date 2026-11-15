import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ORPCError } from "@orpc/client";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "@/lib/toast";
import {
  mediaInfiniteQueryOptions,
  mediaStatsQuery,
} from "@/features/media/queries";
import type { MediaSort } from "@/features/media/media.schema";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import { MediaInUseError, mediaInUseMessage } from "../media-usage";

/** Counts the posts and Moments that use the image now, for the refusal's message. */
async function mediaInUseError(key: string) {
  const [posts, moments] = await Promise.all([
    orpcClient.media.linkedPosts({ key }).catch(() => []),
    orpcClient.media.linkedMoments({ key }).catch(() => []),
  ]);
  return new MediaInUseError(
    mediaInUseMessage({ posts: posts.length, moments: moments.length }),
  );
}

export function useMediaLibrary() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: "/admin/media/" });
  const { unused, view, search, sort } = useSearch({ from: "/admin/media/" });

  const setUnusedOnly = (val: boolean) => {
    void navigate({
      search: (prev) => ({ ...prev, unused: val || undefined }),
    });
  };

  const setSearch = (value: string) => {
    void navigate({
      search: (prev) => ({ ...prev, search: value || undefined }),
      replace: true,
    });
  };

  const setSort = (value: MediaSort) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        sort: value === "newest" ? undefined : value,
      }),
      replace: true,
    });
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError,
    isFetchNextPageError,
    refetch,
  } = useInfiniteQuery({
    ...mediaInfiniteQueryOptions(search?.trim(), unused ?? false, sort),
  });

  const mediaItems = data?.pages.flatMap((page) => page.items) ?? [];
  const { data: stats } = useQuery(mediaStatsQuery);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: orpc.media.key() });

  const deleteMutation = useMutation({
    /**
     * `withRevisions` also deletes the Post Revisions that alone use an
     * image; only the detail of such an image asks for it.
     */
    mutationFn: async ({
      keys,
      withRevisions,
    }: {
      keys: Array<string>;
      withRevisions?: boolean;
    }) => {
      // What the server deleted, which the confirmation's count may predate.
      let deletedRevisionCount = 0;
      for (const key of keys) {
        try {
          const result = await orpcClient.media.remove({ key, withRevisions });
          deletedRevisionCount += result.deletedRevisionCount ?? 0;
        } catch (error) {
          if (error instanceof ORPCError && error.code === "MEDIA_IN_USE") {
            // The list was stale: show what uses the image now.
            await invalidate();
            throw await mediaInUseError(key);
          }
          throw error;
        }
      }
      return { deletedRevisionCount };
    },
    onSuccess: async ({ deletedRevisionCount }, { withRevisions }) => {
      await Promise.all([
        invalidate(),
        withRevisions
          ? queryClient.invalidateQueries({
              queryKey: orpc.posts.admin.revisions.key(),
            })
          : null,
      ]);
      toast.success(
        withRevisions
          ? m.media_deleted_with_revisions({ count: deletedRevisionCount })
          : m.media_deleted(),
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof MediaInUseError
          ? error.message
          : m.media_toast_delete_fail(),
      );
    },
  });

  const deleteUnusedMutation = useMutation({
    mutationFn: () => orpcClient.media.removeUnused(),
    onSuccess: async () => {
      await invalidate();
      toast.success(m.media_deleted());
    },
  });

  const replaceMutation = useMutation({
    mutationFn: (payload: { key: string; image: File }) =>
      orpcClient.media.replace(payload),
    onSuccess: async () => {
      await invalidate();
      toast.success(m.media_replace_success());
    },
    onError: (error) => {
      const typeChanged =
        error instanceof ORPCError &&
        error.code === "MEDIA_INVALID" &&
        (error.data as { detail?: string } | undefined)?.detail ===
          "TYPE_CHANGED";
      toast.error(
        typeChanged ? m.media_replace_type_changed() : m.media_replace_fail(),
      );
    },
  });

  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      void fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  return {
    mediaItems,
    view: view ?? "grid",
    setView: (view: "grid" | "list") =>
      navigate({ search: (prev) => ({ ...prev, view }), replace: true }),
    unusedOnly: unused ?? false,
    setUnusedOnly,
    search: search ?? "",
    setSearch,
    sort: sort ?? "newest",
    setSort,
    loadMore,
    hasMore: hasNextPage ?? false,
    isLoadingMore: isFetchingNextPage,
    isPending,
    isError,
    isFetchNextPageError,
    refetch,
    stats,
    deleteKeys: deleteMutation.mutateAsync,
    deleteUnused: deleteUnusedMutation.mutateAsync,
    isDeleting: deleteMutation.isPending || deleteUnusedMutation.isPending,
    replaceFile: replaceMutation.mutateAsync,
    isReplacing: replaceMutation.isPending,
  };
}
