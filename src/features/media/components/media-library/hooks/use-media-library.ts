import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";
import {
  mediaInfiniteQueryOptions,
  mediaStatsQuery,
} from "@/features/media/queries";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

export function useMediaLibrary() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: "/admin/media/" });
  const { unused, view } = useSearch({ from: "/admin/media/" });

  const setUnusedOnly = (val: boolean) => {
    navigate({
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
        await orpcClient.media.remove({ key });
      }
    },
    onSuccess: async () => {
      await invalidate();
      toast.success(m.media_deleted());
    },
    onError: () => {
      toast.error(m.media_toast_delete_fail());
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
    onError: () => {
      toast.error(m.media_replace_fail());
    },
  });

  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
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
