import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { mediaInfiniteQueryOptions } from "@/features/media/queries";
import { useDebounce } from "@/hooks/use-debounce";
import { isGuitarProFile } from "@/features/media/media.utils";

/**
 * Media picker hook filtered to Guitar Pro files only
 */
export function useGuitarProPicker() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useInfiniteQuery({
      ...mediaInfiniteQueryOptions(debouncedSearch),
    });

  // Flatten all pages and filter to Guitar Pro files only
  const gpItems = useMemo(() => {
    const items = data?.pages.flatMap((page) => page.items) ?? [];
    return items.filter((m) => isGuitarProFile(m.fileName));
  }, [data]);

  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  return {
    gpItems,
    searchQuery,
    setSearchQuery,
    loadMore,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    isPending,
  };
}
