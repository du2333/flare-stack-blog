import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { isSSR } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  getTagsAdminFn,
  getTagsByPostIdFn,
  getTagsFn,
  getTagsWithCountAdminFn,
} from "../api/tags.api";
import type { GetTagsInput } from "../tags.schema";

export const TAGS_KEYS = {
  all: ["tags"] as const,

  // Parent keys (static arrays for prefix invalidation)
  public: ["tags", "public"] as const,
  lists: ["tags", "list"] as const,
  admin: ["tags", "admin"] as const,

  // Child keys (functions for specific queries)
  list: (filters: GetTagsInput) => ["tags", "list", filters] as const,
  adminList: (filters: GetTagsInput) => ["tags", "admin", filters] as const,
  adminWithCount: (filters: GetTagsInput) =>
    ["tags", "admin", "with-count", filters] as const,
  postTags: (postId: number) => ["post", postId, "tags"] as const,
};

export const tagsQueryOptions = queryOptions({
  queryKey: TAGS_KEYS.public,
  queryFn: async () => {
    if (isSSR) {
      return await getTagsFn();
    }
    const res = await apiClient.tags.$get();
    if (!res.ok) throw new Error(m.tag_selector_load_fail());
    return res.json();
  },
});

export function tagsAdminQueryOptions(options: GetTagsInput = {}) {
  return queryOptions({
    queryKey: TAGS_KEYS.adminList(options),
    queryFn: () => getTagsAdminFn({ data: options }),
    staleTime: Infinity,
  });
}

export function tagsByPostIdQueryOptions(postId: number) {
  return queryOptions({
    queryKey: TAGS_KEYS.postTags(postId),
    queryFn: () => getTagsByPostIdFn({ data: { postId } }),
  });
}

export function tagsWithCountAdminQueryOptions(options: GetTagsInput = {}) {
  return queryOptions({
    queryKey: TAGS_KEYS.adminWithCount(options),
    queryFn: () => getTagsWithCountAdminFn({ data: options }),
  });
}
