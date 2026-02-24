import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import {
  getLinkedMediaKeysFn,
  getMediaFn,
  getTotalMediaSizeFn,
} from "../media.api";
import type { MediaCategory } from "../media.schema";

export const MEDIA_KEYS = {
  all: ["media"] as const,

  // Parent keys (static arrays for prefix invalidation)
  lists: ["media", "list"] as const,
  totalSize: ["media", "total-size"] as const,
  linked: ["media", "linked-keys"] as const,

  // Child keys (functions for specific queries)
  list: (search: string = "", unusedOnly: boolean = false, category?: MediaCategory) =>
    ["media", "list", search, unusedOnly, category ?? "all"] as const,
  linkedKeys: (keys: string) => ["media", "linked-keys", keys] as const,
  linkedPosts: (key: string) => ["media", "linked-posts", key] as const,
};

export function mediaInfiniteQueryOptions(
  search: string = "",
  unusedOnly: boolean = false,
  category?: MediaCategory,
) {
  return infiniteQueryOptions({
    queryKey: MEDIA_KEYS.list(search, unusedOnly, category),
    queryFn: ({ pageParam }) =>
      getMediaFn({
        data: {
          cursor: pageParam,
          search: search || undefined,
          unusedOnly: unusedOnly || undefined,
          category: category || undefined,
        },
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as number | undefined,
  });
}

export function linkedMediaKeysQuery(keys: Array<string>) {
  // Stable key for linked media; use joined keys to avoid referential changes
  const joinedKeys = keys.join("|");
  return queryOptions({
    queryKey: MEDIA_KEYS.linkedKeys(joinedKeys),
    queryFn: () => getLinkedMediaKeysFn({ data: { keys } }),
    staleTime: 30000,
  });
}

export const totalMediaSizeQuery = queryOptions({
  queryKey: MEDIA_KEYS.totalSize,
  queryFn: () => getTotalMediaSizeFn(),
});
