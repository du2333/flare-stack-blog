import { orpc } from "@/lib/orpc";

export function mediaInfiniteQueryOptions(
  search: string = "",
  unusedOnly: boolean = false,
) {
  return orpc.media.list.infiniteOptions({
    input: (pageParam: number | undefined) => ({
      cursor: pageParam,
      search: search || undefined,
      unusedOnly: unusedOnly || undefined,
    }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function linkedPostsQuery(key: string) {
  return orpc.media.linkedPosts.queryOptions({
    input: { key },
    enabled: !!key,
  });
}

export const mediaStatsQuery = orpc.media.stats.queryOptions();
