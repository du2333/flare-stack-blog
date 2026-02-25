import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import {
  getGuitarTabsFn,
  getGuitarTabMetaFn,
  getGuitarTabBySlugFn,
  getLinkedMediaKeysFn,
  getMediaFn,
  getTotalMediaSizeFn,
  getMyGuitarTabsFn,
} from "../media.api";
import type { MediaCategory } from "../media.schema";

export const MEDIA_KEYS = {
  all: ["media"] as const,

  // Parent keys (static arrays for prefix invalidation)
  lists: ["media", "list"] as const,
  totalSize: ["media", "total-size"] as const,
  linked: ["media", "linked-keys"] as const,
  guitarTabs: ["media", "guitar-tabs"] as const,
  guitarTabMeta: ["media", "guitar-tab-meta"] as const,
  guitarTabDetail: ["media", "guitar-tab-detail"] as const,
  myGuitarTabs: ["media", "my-guitar-tabs"] as const,

  // Child keys (functions for specific queries)
  list: (search: string = "", unusedOnly: boolean = false, category?: MediaCategory) =>
    ["media", "list", search, unusedOnly, category ?? "all"] as const,
  linkedKeys: (keys: string) => ["media", "linked-keys", keys] as const,
  linkedPosts: (key: string) => ["media", "linked-posts", key] as const,
  guitarTabsList: (search: string = "", page: number = 1, pageSize: number = 20) =>
    ["media", "guitar-tabs", search, page, pageSize] as const,
  guitarTabMetaById: (mediaId: number) =>
    ["media", "guitar-tab-meta", mediaId] as const,
  guitarTabBySlug: (slug: string) =>
    ["media", "guitar-tab-detail", slug] as const,
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

// ─── 吉他谱元数据（管理后台用） ──────────────────────

export function guitarTabMetaQuery(mediaId: number) {
  return queryOptions({
    queryKey: MEDIA_KEYS.guitarTabMetaById(mediaId),
    queryFn: () => getGuitarTabMetaFn({ data: { mediaId } }),
    enabled: !!mediaId,
    staleTime: 60_000,
  });
}

// ─── 公开吉他谱列表（分页） ──────────────────────────

export function guitarTabsQueryOptions(
  search: string = "",
  page: number = 1,
  pageSize: number = 20,
) {
  return queryOptions({
    queryKey: MEDIA_KEYS.guitarTabsList(search, page, pageSize),
    queryFn: () =>
      getGuitarTabsFn({
        data: {
          page,
          pageSize,
          search: search || undefined,
        },
      }),
  });
}

// ─── 用户已提交的吉他谱 ──────────────────────────────

export function myGuitarTabsQuery() {
  return queryOptions({
    queryKey: MEDIA_KEYS.myGuitarTabs,
    queryFn: () => getMyGuitarTabsFn(),
  });
}

// ─── 吉他谱详情页（根据 slug） ──────────────────────

export function guitarTabDetailQuery(slug: string) {
  return queryOptions({
    queryKey: MEDIA_KEYS.guitarTabBySlug(slug),
    queryFn: () => getGuitarTabBySlugFn({ data: { slug } }),
    enabled: !!slug,
    staleTime: 60_000,
  });
}
