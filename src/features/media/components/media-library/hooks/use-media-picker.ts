import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { mediaInfiniteQueryOptions } from "@/features/media/queries";

export function useMediaPicker(enabled = true) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useInfiniteQuery({
      ...mediaInfiniteQueryOptions(),
      enabled,
    });

  const mediaItems = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) ?? [];
  }, [data]);

  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  return {
    mediaItems,
    loadMore,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    isPending,
  };
}
