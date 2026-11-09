import { orpc } from "@/lib/orpc";
import { emptyListOnNotFound } from "@/lib/orpc/null-on-not-found";

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

/** Resolves to no posts for an image that does not exist (the server answers 404). */
export function linkedPostsQuery(key: string) {
  return emptyListOnNotFound(
    orpc.media.linkedPosts.queryOptions({
      input: { key },
      enabled: !!key,
    }),
    "MEDIA_NOT_FOUND",
  );
}

/** Resolves to no Moments for an image that does not exist (the server answers 404). */
export function linkedMomentsQuery(key: string, enabled = true) {
  return emptyListOnNotFound(
    orpc.media.linkedMoments.queryOptions({
      input: { key },
      enabled: enabled && !!key,
    }),
    "MEDIA_NOT_FOUND",
  );
}

export const mediaStatsQuery = orpc.media.stats.queryOptions();
