import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { SortField, StatusFilter } from "../types";
import { STATUS_FILTERS } from "../types";

interface PostsToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  sortBy: SortField;
  onSortByChange: (sortBy: SortField) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export function PostsToolbar({
  searchTerm,
  onSearchChange,
  status,
  onStatusChange,
  sortBy,
  onSortByChange,
  onResetFilters,
  hasActiveFilters,
}: PostsToolbarProps) {
  const statusLabel: Record<StatusFilter, string> = {
    ALL: m.admin_posts_filter_all(),
    PUBLISHED: m.admin_posts_filter_published(),
    DRAFT: m.admin_posts_filter_draft(),
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 fuwari-text-50"
          size={16}
          strokeWidth={1.5}
        />
        <Input
          type="text"
          placeholder={m.admin_posts_search_placeholder()}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-11 rounded-xl border border-(--fuwari-input-border) bg-(--fuwari-input-bg) py-1 pl-10 pr-10 font-sans text-sm shadow-none focus-visible:border-(--fuwari-primary) focus-visible:ring-0"
        />
        {searchTerm ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg fuwari-text-50 hover:text-(--fuwari-primary)"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onStatusChange(item)}
            className={cn(
              "rounded-xl h-9 px-3 text-sm font-medium",
              status === item ? "fuwari-btn-primary" : "fuwari-btn-regular",
            )}
          >
            {statusLabel[item]}
          </button>
        ))}

        <span className="w-px h-5 bg-(--fuwari-meta-divider) mx-1 hidden sm:block" />

        <button
          type="button"
          onClick={() => onSortByChange("updatedAt")}
          className={cn(
            "rounded-xl h-9 px-3 text-sm font-medium",
            sortBy === "updatedAt" ? "fuwari-btn-primary" : "fuwari-btn-regular",
          )}
        >
          {m.admin_posts_sort_recent_upd()}
        </button>
        <button
          type="button"
          onClick={() => onSortByChange("publishedAt")}
          className={cn(
            "rounded-xl h-9 px-3 text-sm font-medium",
            sortBy === "publishedAt"
              ? "fuwari-btn-primary"
              : "fuwari-btn-regular",
          )}
        >
          {m.admin_posts_sort_recent_pub()}
        </button>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="rounded-xl h-9 px-3 text-sm fuwari-text-50 hover:text-(--fuwari-primary)"
          >
            {m.admin_posts_clear_filters()}
          </button>
        ) : null}
      </div>
    </div>
  );
}
