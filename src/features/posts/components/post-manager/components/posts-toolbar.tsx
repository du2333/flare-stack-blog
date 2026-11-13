import { useQuery } from "@tanstack/react-query";
import { useEffect, type Ref } from "react";
import DropdownMenu from "@/components/ui/dropdown-menu";
import { SearchField } from "@/components/ui/search-field";
import { Tabs } from "@/components/ui/tabs";
import { categoryOptionsQuery } from "@/features/categories/queries";
import type { AdminPostStatusCounts } from "@/features/posts/schema/posts.schema";
import { tagsAdminQueryOptions } from "@/features/tags/queries";
import { m } from "@/paraglide/messages";
import type {
  CategoryFilter,
  PostPopularity,
  SortField,
  StatusFilter,
} from "../types";
import { SORT_FIELDS } from "../types";

export function sortLabel(field: SortField) {
  switch (field) {
    case "updatedAt":
      return m.admin_posts_sort_recent_upd();
    case "publishedAt":
      return m.admin_posts_sort_recent_pub();
    case "viewCount":
      return m.admin_posts_sort_views();
    case "commentCount":
      return m.admin_posts_sort_comments();
    default:
      field satisfies never;
      return "";
  }
}

/** The status filter as a segmented track, each with its count. */
export function PostsStatusTabs({
  status,
  statusCounts,
  onStatusChange,
}: {
  status: StatusFilter;
  statusCounts?: AdminPostStatusCounts;
  onStatusChange: (status: StatusFilter) => void;
}) {
  const total = statusCounts
    ? statusCounts.draft + statusCounts.published
    : undefined;
  return (
    <Tabs
      variant="segmented"
      aria-label={m.admin_posts_filter_status()}
      value={status}
      onValueChange={onStatusChange}
      items={[
        { value: "ALL", label: m.admin_posts_filter_all(), count: total },
        {
          value: "PUBLISHED",
          label: m.admin_posts_filter_published(),
          count: statusCounts?.published,
        },
        {
          value: "CHANGED",
          label: m.admin_posts_filter_changed(),
          count: statusCounts?.unpublishedChanges,
        },
        {
          value: "DRAFT",
          label: m.admin_posts_filter_draft(),
          count: statusCounts?.draft,
        },
      ]}
    />
  );
}

/**
 * The search ("/" focuses it) and a chip each for the Category, the Tag and
 * the sort. A Category or Tag filter left in the address after it was
 * deleted is dropped without a history entry.
 */
export function PostsTools({
  searchTerm,
  onSearchChange,
  searchRef,
  category,
  onCategoryChange,
  tag,
  onTagChange,
  sortBy,
  onSortByChange,
  popularity,
}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchRef?: Ref<HTMLInputElement>;
  category?: CategoryFilter;
  /** `replace` drops a stale filter without adding a history entry. */
  onCategoryChange: (category?: CategoryFilter, replace?: boolean) => void;
  tag?: number;
  onTagChange: (tag?: number, replace?: boolean) => void;
  /** The sort the server applied. */
  sortBy: SortField;
  onSortByChange: (sortBy: SortField) => void;
  /** Whether the views can be sorted by; unknown while the list loads. */
  popularity?: PostPopularity;
}) {
  const categoriesQuery = useQuery({
    ...categoryOptionsQuery,
    refetchOnMount: "always",
  });
  const tagsQuery = useQuery({
    ...tagsAdminQueryOptions(),
    refetchOnMount: "always",
  });
  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const staleCategory =
    typeof category === "number" &&
    categoriesQuery.isSuccess &&
    !categoriesQuery.isFetching &&
    !categories.some((item) => item.id === category);
  const staleTag =
    tag !== undefined &&
    tagsQuery.isSuccess &&
    !tagsQuery.isFetching &&
    !tags.some((item) => item.id === tag);
  useEffect(() => {
    if (staleCategory) onCategoryChange(undefined, true);
    else if (staleTag) onTagChange(undefined, true);
  }, [staleCategory, staleTag, onCategoryChange, onTagChange]);

  // Views come from the popularity snapshot; without it there is no sorting by them.
  const viewsSortable = popularity === undefined || popularity === "ready";
  const sortFields = SORT_FIELDS.filter(
    (field) => field !== "viewCount" || viewsSortable,
  );

  return (
    <>
      <SearchField
        ref={searchRef}
        variant="raised"
        shortcut="/"
        value={searchTerm}
        onValueChange={onSearchChange}
        placeholder={m.admin_posts_search_placeholder()}
        aria-label={m.admin_posts_search_placeholder()}
        clearLabel={m.admin_posts_clear_search()}
      />
      <DropdownMenu
        variant="chip"
        ariaLabel={m.admin_posts_filter_category()}
        neutral=""
        value={category === undefined ? "" : String(category)}
        onChange={(value) =>
          onCategoryChange(
            value === "" ? undefined : value === "none" ? "none" : +value,
          )
        }
        options={[
          { value: "", label: m.admin_posts_filter_category_all() },
          { value: "none", label: m.post_uncategorized() },
          ...categories.map((item) => ({
            value: String(item.id),
            label: item.name,
          })),
        ]}
      />
      <DropdownMenu
        variant="chip"
        ariaLabel={m.admin_posts_filter_tag()}
        neutral=""
        value={tag === undefined ? "" : String(tag)}
        onChange={(value) => onTagChange(value === "" ? undefined : +value)}
        options={[
          { value: "", label: m.admin_posts_filter_tag_all() },
          ...tags.map((item) => ({ value: String(item.id), label: item.name })),
        ]}
      />
      <DropdownMenu
        variant="chip"
        ariaLabel={m.admin_posts_sort_label()}
        value={sortFields.includes(sortBy) ? sortBy : "updatedAt"}
        onChange={(value) => onSortByChange(value as SortField)}
        options={sortFields.map((field) => ({
          value: field,
          label: sortLabel(field),
        }))}
      />
    </>
  );
}
