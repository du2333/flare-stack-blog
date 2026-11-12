import DropdownMenu from "@/components/ui/dropdown-menu";
import { m } from "@/paraglide/messages";
import type { CategoryFilter, SortField } from "../types";
import { SORT_FIELDS } from "../types";
import "./posts-filter-panel.css";

const FIELD_TRIGGER =
  "group fuwari-input flex w-full items-center justify-between gap-2 text-left";

type Option = { id: number; name: string };

interface PostsFilterPanelProps {
  categories: Array<Option>;
  tags: Array<Option>;
  category?: CategoryFilter;
  onCategoryChange: (category?: CategoryFilter) => void;
  tag?: number;
  onTagChange: (tag?: number) => void;
  /** Where the toolbar has no room for the sort, it is chosen here. */
  sortBy?: SortField;
  onSortByChange?: (sortBy: SortField) => void;
  /** The sorts on offer. */
  sortFields?: ReadonlyArray<SortField>;
}

export function sortLabel(sortBy: SortField) {
  switch (sortBy) {
    case "updatedAt":
      return m.admin_posts_sort_recent_upd();
    case "publishedAt":
      return m.admin_posts_sort_recent_pub();
    case "viewCount":
      return m.admin_posts_sort_views();
    case "commentCount":
      return m.admin_posts_sort_comments();
  }
}

/**
 * The choosers behind the Posts toolbar's 「筛选」 button: Category and Tag,
 * and the sort where the toolbar has no room for it. The popover and the
 * bottom sheet both hold it.
 */
export function PostsFilterPanel({
  categories,
  tags,
  category,
  onCategoryChange,
  tag,
  onTagChange,
  sortBy,
  onSortByChange,
  sortFields = SORT_FIELDS,
}: PostsFilterPanelProps) {
  return (
    <div className="posts-filter-panel">
      {sortBy !== undefined && onSortByChange ? (
        <div className="posts-filter-field">
          <span>{m.admin_posts_sort_label()}</span>
          <DropdownMenu
            value={sortFields.includes(sortBy) ? sortBy : "updatedAt"}
            ariaLabel={m.admin_posts_sort_label()}
            triggerClassName={FIELD_TRIGGER}
            matchTriggerWidth
            placement="bottom-start"
            onChange={(value) => onSortByChange(value as SortField)}
            options={sortFields.map((value) => ({
              value,
              label: sortLabel(value),
            }))}
          />
        </div>
      ) : null}
      <div className="posts-filter-field">
        <span>{m.admin_posts_filter_category()}</span>
        <DropdownMenu
          value={category === undefined ? "" : String(category)}
          ariaLabel={m.admin_posts_filter_category()}
          triggerClassName={FIELD_TRIGGER}
          matchTriggerWidth
          placement="bottom-start"
          onChange={(value) =>
            onCategoryChange(
              value === "" ? undefined : value === "none" ? value : +value,
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
      </div>
      <div className="posts-filter-field">
        <span>{m.admin_posts_filter_tag()}</span>
        <DropdownMenu
          value={tag === undefined ? "" : String(tag)}
          ariaLabel={m.admin_posts_filter_tag()}
          triggerClassName={FIELD_TRIGGER}
          matchTriggerWidth
          placement="bottom-start"
          onChange={(value) => onTagChange(value === "" ? undefined : +value)}
          options={[
            { value: "", label: m.admin_posts_filter_tag_all() },
            ...tags.map((item) => ({
              value: String(item.id),
              label: item.name,
            })),
          ]}
        />
      </div>
    </div>
  );
}
