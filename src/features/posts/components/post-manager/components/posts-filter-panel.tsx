import { Settings2 } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import DropdownMenu from "@/components/ui/dropdown-menu";
import { SegmentedControl } from "@/components/ui/segmented-control";
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
  /** Opens the categories and tags sheet. */
  onManageTaxonomy?: () => void;
}

export function sortLabel(sortBy: SortField) {
  return sortBy === "updatedAt"
    ? m.admin_posts_sort_recent_upd()
    : m.admin_posts_sort_recent_pub();
}

/**
 * The choosers behind the Posts toolbar's 「筛选」 button: Category and Tag,
 * the sort where the toolbar has no room for it, and the way into managing
 * Categories and Tags. The popover and the bottom sheet both hold it.
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
  onManageTaxonomy,
}: PostsFilterPanelProps) {
  const sortId = useId();
  return (
    <div className="posts-filter-panel">
      {sortBy !== undefined && onSortByChange ? (
        <div className="posts-filter-field">
          <span id={sortId}>{m.admin_posts_sort_label()}</span>
          <SegmentedControl
            aria-labelledby={sortId}
            stretch
            value={sortBy}
            onValueChange={onSortByChange}
            items={SORT_FIELDS.map((value) => ({
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
      {onManageTaxonomy ? (
        <div className="posts-filter-footer">
          <Button
            variant="text"
            icon={<Settings2 size={16} />}
            aria-haspopup="dialog"
            onClick={onManageTaxonomy}
          >
            {m.admin_posts_manage_taxonomy()}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
