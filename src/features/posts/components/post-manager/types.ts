import type { Post } from "@/lib/db/schema";

/** Post without contentJson fields for list views */
export type PostListItem = Omit<Post, "contentJson" | "publicContentJson">;

/** Status filter options for posts list */
export const STATUS_FILTERS = ["ALL", "PUBLISHED", "DRAFT"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

/** Sort fields options */
export const SORT_FIELDS = ["publishedAt", "updatedAt"] as const;
export type SortField = (typeof SORT_FIELDS)[number];

/** Sort direction options */
export const SORT_DIRECTIONS = ["ASC", "DESC"] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/** Convert StatusFilter to API status param */
export function statusFilterToApi(
  filter: StatusFilter,
): "published" | "draft" | undefined {
  if (filter === "ALL") return undefined;
  return filter === "PUBLISHED" ? "published" : "draft";
}
