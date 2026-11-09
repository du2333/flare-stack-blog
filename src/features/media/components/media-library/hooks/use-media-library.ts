import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ORPCError } from "@orpc/client";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";
import {
  mediaInfiniteQueryOptions,
  mediaStatsQuery,
} from "@/features/media/queries";
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
  const { unused, view } = useSearch({ from: "/admin/media/" });

  const setUnusedOnly = (val: boolean) => {
    void navigate({
      search: (prev) => ({ ...prev, unused: val || undefined }),
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
    ...mediaInfiniteQueryOptions("", unused ?? false),
  });

  const mediaItems = data?.pages.flatMap((page) => page.items) ?? [];
  const { data: stats } = useQuery(mediaStatsQuery);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: orpc.media.key() });

  const deleteMutation = useMutation({
    mutationFn: async (keys: Array<string>) => {
      for (const key of keys) {
        try {
          await orpcClient.media.remove({ key });
        } catch (error) {
          if (error instanceof ORPCError && error.code === "MEDIA_IN_USE") {
            // The list was stale: show what uses the image now.
            await invalidate();
            throw await mediaInUseError(key);
          }
          throw error;
        }
      }
    },
    onSuccess: async () => {
      await invalidate();
      toast.success(m.media_deleted());
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
