import { LayoutGrid, List } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AdminPageToolbar } from "@/components/admin/admin-page";
import DropdownMenu from "@/components/ui/dropdown-menu";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Tabs } from "@/components/ui/tabs";
import type { MediaSort } from "@/features/media/media.schema";
import { m } from "@/paraglide/messages";

export type MediaView = "grid" | "list";

export function MediaToolbar({
  unusedOnly,
  onUnusedOnlyChange,
  unusedCount,
  totalCount,
  search,
  onSearchChange,
  sort,
  onSortChange,
  view,
  onViewChange,
}: {
  unusedOnly: boolean;
  onUnusedOnlyChange: (val: boolean) => void;
  unusedCount?: number;
  totalCount?: number;
  /** The search in the address; the field follows it, including a clear from elsewhere. */
  search: string;
  onSearchChange: (value: string) => void;
  sort: MediaSort;
  onSortChange: (sort: MediaSort) => void;
  view: MediaView;
  onViewChange: (view: MediaView) => void;
}) {
  const [input, setInput] = useState(search);
  const searchCallback = useRef(onSearchChange);
  searchCallback.current = onSearchChange;
  useEffect(() => setInput(search), [search]);
  useEffect(() => {
    if (input === search) return;
    const timer = window.setTimeout(() => searchCallback.current(input), 300);
    return () => window.clearTimeout(timer);
  }, [input, search]);

  const sortLabels: Record<MediaSort, string> = {
    newest: m.media_sort_newest(),
    oldest: m.media_sort_oldest(),
    largest: m.media_sort_largest(),
  };

  return (
    <AdminPageToolbar
      className="media-toolbar"
      tabs={
        <Tabs
          aria-label={m.media_filter_label()}
          value={unusedOnly ? "unused" : "all"}
          onValueChange={(value) => onUnusedOnlyChange(value === "unused")}
          items={[
            {
              value: "all",
              label: m.media_filter_all(),
              count: totalCount ?? "—",
            },
            {
              value: "unused",
              label: m.media_unreferenced(),
              count: unusedCount ?? "—",
            },
          ]}
        />
      }
      tools={
        <>
          <SearchField
            variant="raised"
            shortcut="/"
            aria-label={m.media_search_placeholder()}
            placeholder={m.media_search_placeholder()}
            value={input}
            onValueChange={setInput}
            clearLabel={m.search_clear()}
          />
          <DropdownMenu
            variant="chip"
            value={sort}
            ariaLabel={m.admin_posts_sort_label()}
            onChange={(value) => onSortChange(value as MediaSort)}
            options={(Object.keys(sortLabels) as Array<MediaSort>).map(
              (value) => ({ value, label: sortLabels[value] }),
            )}
          />
          <SegmentedControl
            className="media-view-switch"
            size="sm"
            aria-label={m.media_view_label()}
            value={view}
            onValueChange={onViewChange}
            items={(
              [
                ["grid", LayoutGrid, m.media_view_grid()],
                ["list", List, m.media_view_list()],
              ] as const
            ).map(([value, Icon, label]) => ({
              value,
              label: (
                <>
                  <Icon size={16} aria-hidden="true" />
                  <span className="sr-only">{label}</span>
                </>
              ),
            }))}
          />
        </>
      }
    />
  );
}
