import { ArrowUpDown, Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Dropdown from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { m } from "@/paraglide/messages";
import type { SortDirection, SortField, StatusFilter } from "../types";
import { STATUS_FILTERS } from "../types";

interface PostsToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  sortDir: SortDirection;
  sortBy: SortField;
  onSortUpdate: (update: { dir?: SortDirection; sortBy?: SortField }) => void;
  onResetFilters: () => void;
}

export function PostsToolbar({
  searchTerm,
  onSearchChange,
  status,
  onStatusChange,
  sortDir,
  sortBy,
  onSortUpdate,
  onResetFilters,
}: PostsToolbarProps) {
  const hasActiveFilters =
    status !== "ALL" ||
    sortDir !== "DESC" ||
    sortBy !== "updatedAt" ||
    searchTerm !== "";

  return (
    <div className="flex flex-col lg:flex-row gap-4 mb-8 items-stretch lg:items-center w-full border-b border-border/30 pb-8">
      {/* Search Input Group */}
      <div className="relative flex-1 group">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors"
          size={14}
          strokeWidth={1.5}
        />
        <Input
          type="text"
          placeholder={m.admin_posts_search_placeholder()}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-9 h-10 bg-transparent border-border/30 hover:border-foreground/50 focus:border-foreground transition-all rounded-none font-sans text-sm shadow-none focus-visible:ring-0"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSearchChange("")}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground rounded-none"
          >
            <X size={14} />
          </Button>
        )}
      </div>

      {/* Filters Group */}
      <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap">
        <div className="h-4 w-px bg-border/30 mx-2 hidden lg:block" />

        {/* 1. Status Filter */}
        <Dropdown
          align="left"
          trigger={
            <Button
              variant="outline"
              size="sm"
              className={`
                    h-10 border-border/30 hover:border-foreground
                    flex items-center gap-2 text-[11px] font-medium transition-all px-4 rounded-none shadow-none
                    ${
                      status !== "ALL"
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-muted-foreground hover:text-foreground"
                    }
                `}
            >
              <Filter size={14} strokeWidth={1.5} />
              <span className="uppercase tracking-widest font-mono">
                {
                  {
                    ALL: m.admin_posts_filter_status(),
                    PUBLISHED: m.admin_posts_filter_published(),
                    DRAFT: m.admin_posts_filter_draft(),
                  }[status]
                }
              </span>
            </Button>
          }
          items={STATUS_FILTERS.map((s) => ({
            label: {
              ALL: m.admin_posts_filter_all(),
              PUBLISHED: m.admin_posts_filter_published(),
              DRAFT: m.admin_posts_filter_draft(),
            }[s],
            onClick: () => onStatusChange(s),
            isActive: status === s,
            className: "font-mono",
          }))}
        />

        {/* 2. Sort Dropdown */}
        <Dropdown
          align="right"
          trigger={
            <Button
              variant="outline"
              size="sm"
              className={`
                    h-10 border-border/30 hover:border-foreground
                    flex items-center gap-2 text-[11px] font-medium transition-all px-4 rounded-none shadow-none
                    ${
                      sortDir !== "DESC" || sortBy !== "updatedAt"
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-muted-foreground hover:text-foreground"
                    }
                `}
            >
              <ArrowUpDown size={14} strokeWidth={1.5} />
              <span className="uppercase tracking-widest font-mono">
                {sortBy === "publishedAt"
                  ? m.admin_posts_sort_published()
                  : m.admin_posts_sort_updated()}
              </span>
            </Button>
          }
          items={[
            {
              label: m.admin_posts_sort_recent_pub(),
              onClick: () =>
                onSortUpdate({ sortBy: "publishedAt", dir: "DESC" }),
              isActive: sortBy === "publishedAt" && sortDir === "DESC",
            },
            {
              label: m.admin_posts_sort_recent_upd(),
              onClick: () => onSortUpdate({ sortBy: "updatedAt", dir: "DESC" }),
              isActive: sortBy === "updatedAt" && sortDir === "DESC",
            },
          ].map((opt) => ({
            label: opt.label,
            onClick: opt.onClick,
            isActive: opt.isActive,
            className: "font-mono",
          }))}
        />

        {/* Reset Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onResetFilters}
            className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-none"
            title={m.admin_posts_clear_filters()}
          >
            <X size={16} strokeWidth={1.5} />
          </Button>
        )}
      </div>
    </div>
  );
}
