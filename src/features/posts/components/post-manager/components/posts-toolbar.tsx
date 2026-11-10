import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useState, type Ref } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DropdownMenu from "@/components/ui/dropdown-menu";
import { FloatingPopover } from "@/components/ui/floating-popover";
import { IconButton } from "@/components/ui/icon-button";
import { SectionHeading } from "@/components/ui/page-heading";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { Tabs } from "@/components/ui/tabs";
import { categoryOptionsQuery } from "@/features/categories/queries";
import type { AdminPostStatusCounts } from "@/features/posts/schema/posts.schema";
import { tagsAdminQueryOptions } from "@/features/tags/queries";
import { useMediaQuery } from "@/hooks/use-motion";
import { m } from "@/paraglide/messages";
import type { CategoryFilter, SortField, StatusFilter } from "../types";
import { SORT_FIELDS, STATUS_FILTERS, WIDE_TOOLBAR_QUERY } from "../types";
import { PostsFilterPanel, sortLabel } from "./posts-filter-panel";

const SORT_TRIGGER =
  "group fuwari-input inline-flex w-auto max-w-44 items-center gap-2 text-left";

/** A mousedown inside a menu opened from the panel is not outside the panel. */
const inMenu = (target: Node) =>
  target instanceof Element && target.closest('[role="menu"]') !== null;

interface PostsToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchRef: Ref<HTMLInputElement>;
  status: StatusFilter;
  statusCounts?: AdminPostStatusCounts;
  onStatusChange: (status: StatusFilter) => void;
  category?: CategoryFilter;
  /** `replace` drops a stale filter without adding a history entry. */
  onCategoryChange: (category?: CategoryFilter, replace?: boolean) => void;
  tag?: number;
  onTagChange: (tag?: number, replace?: boolean) => void;
  sortBy: SortField;
  onSortByChange: (sortBy: SortField) => void;
  /** Clears the chosen Category and Tag only, not the search or the status. */
  onClearTaxonomy?: () => void;
  /** Opens the categories and tags sheet. */
  onManageTaxonomy?: () => void;
}

export function PostsToolbar({
  searchTerm,
  onSearchChange,
  searchRef,
  status,
  statusCounts,
  onStatusChange,
  category,
  onCategoryChange,
  tag,
  onTagChange,
  sortBy,
  onSortByChange,
  onClearTaxonomy,
  onManageTaxonomy,
}: PostsToolbarProps) {
  const wide = useMediaQuery(WIDE_TOOLBAR_QUERY);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterButton, setFilterButton] = useState<HTMLButtonElement | null>(
    null,
  );
  const panelId = useId();
  const titleId = useId();
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
  // A filter left in the URL after its category or tag was deleted.
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
  const labels: Record<StatusFilter, string> = {
    ALL: m.admin_posts_filter_all(),
    PUBLISHED: m.admin_posts_filter_published(),
    CHANGED: m.admin_posts_filter_changed(),
    DRAFT: m.admin_posts_filter_draft(),
  };
  const counts = statusCounts
    ? {
        ALL: statusCounts.draft + statusCounts.published,
        PUBLISHED: statusCounts.published,
        CHANGED: statusCounts.unpublishedChanges,
        DRAFT: statusCounts.draft,
      }
    : undefined;

  const categoryName =
    category === undefined
      ? undefined
      : category === "none"
        ? m.post_uncategorized()
        : categories.find((item) => item.id === category)?.name;
  const tagName =
    tag === undefined ? undefined : tags.find((item) => item.id === tag)?.name;
  const activeCount =
    (category === undefined ? 0 : 1) + (tag === undefined ? 0 : 1);

  const manageTaxonomy = onManageTaxonomy
    ? () => {
        // The taxonomy sheet returns focus to the button, which outlives the panel.
        filterButton?.focus({ preventScroll: true });
        setFilterOpen(false);
        onManageTaxonomy();
      }
    : undefined;
  const panel = (
    <PostsFilterPanel
      categories={categories}
      tags={tags}
      category={category}
      onCategoryChange={onCategoryChange}
      tag={tag}
      onTagChange={onTagChange}
      sortBy={wide ? undefined : sortBy}
      onSortByChange={wide ? undefined : onSortByChange}
      onManageTaxonomy={manageTaxonomy}
    />
  );

  const tabs = (
    <Tabs
      className="post-list-tabs"
      aria-label={m.admin_posts_filter_status()}
      value={status}
      onValueChange={onStatusChange}
      items={STATUS_FILTERS.map((value) => ({
        value,
        label: labels[value],
        count: counts?.[value] ?? "—",
      }))}
    />
  );
  const search = (
    <SearchField
      ref={searchRef}
      className="post-list-search"
      aria-label={m.admin_posts_search_placeholder()}
      placeholder={m.admin_posts_search_placeholder()}
      value={searchTerm}
      onValueChange={onSearchChange}
      clearLabel={m.admin_posts_clear_search()}
    />
  );
  const filter = (
    <Button
      ref={setFilterButton}
      className="post-list-filter-button"
      icon={<SlidersHorizontal size={16} />}
      aria-haspopup="dialog"
      aria-expanded={filterOpen}
      aria-controls={filterOpen ? panelId : undefined}
      onClick={() => setFilterOpen((open) => !open)}
    >
      {m.admin_posts_filter_button()}
      {activeCount > 0 ? (
        <span className="post-list-filter-count">{activeCount}</span>
      ) : null}
    </Button>
  );

  return (
    <>
      {wide ? (
        <div className="admin-frame-toolbar">
          {tabs}
          <div className="post-list-tools">
            {search}
            {filter}
            <DropdownMenu
              value={sortBy}
              ariaLabel={m.admin_posts_sort_label()}
              triggerClassName={SORT_TRIGGER}
              placement="bottom-end"
              onChange={(value) => onSortByChange(value as SortField)}
              options={SORT_FIELDS.map((value) => ({
                value,
                label: sortLabel(value),
              }))}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="admin-frame-toolbar">{tabs}</div>
          <div className="post-list-tools">
            {search}
            {filter}
          </div>
        </>
      )}
      {activeCount > 0 ? (
        <div className="post-list-chips">
          {categoryName !== undefined ? (
            <Badge
              onRemove={() => onCategoryChange(undefined)}
              removeLabel={m.admin_posts_filter_remove({ name: categoryName })}
            >
              {m.admin_posts_filter_chip_category({ name: categoryName })}
            </Badge>
          ) : null}
          {tagName !== undefined ? (
            <Badge
              onRemove={() => onTagChange(undefined)}
              removeLabel={m.admin_posts_filter_remove({ name: tagName })}
            >
              {m.admin_posts_filter_chip_tag({ name: tagName })}
            </Badge>
          ) : null}
          {onClearTaxonomy ? (
            <Button variant="text" size="sm" onClick={onClearTaxonomy}>
              {m.admin_posts_clear_filters()}
            </Button>
          ) : null}
        </div>
      ) : null}
      {wide ? (
        <FloatingPopover
          open={filterOpen}
          anchor={filterButton}
          placement="bottom-end"
          returnFocusOnEscape
          ignoreOutside={inMenu}
          onDismiss={() => setFilterOpen(false)}
          initialFocus={() =>
            document.getElementById(panelId)?.querySelector("button") ?? null
          }
          id={panelId}
          role="dialog"
          aria-label={m.admin_posts_filter_button()}
          className="posts-filter-popover"
        >
          {panel}
        </FloatingPopover>
      ) : (
        <Sheet
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          side="bottom"
          id={panelId}
          aria-labelledby={titleId}
        >
          <div className="posts-filter-sheet-head">
            <SectionHeading
              size="sm"
              title={m.admin_posts_filter_button()}
              titleProps={{ id: titleId }}
              actions={
                <IconButton
                  size="md"
                  label={m.common_close()}
                  onClick={() => setFilterOpen(false)}
                >
                  <X size={18} />
                </IconButton>
              }
            />
          </div>
          <div className="posts-filter-sheet-body">{panel}</div>
        </Sheet>
      )}
    </>
  );
}
