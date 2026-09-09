import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export type MediaView = "grid" | "list";

export function MediaToolbar({
  unusedOnly,
  onUnusedOnlyChange,
  unusedCount,
  totalCount,
  view,
  onViewChange,
}: {
  unusedOnly: boolean;
  onUnusedOnlyChange: (val: boolean) => void;
  unusedCount?: number;
  totalCount?: number;
  view: MediaView;
  onViewChange: (view: MediaView) => void;
}) {
  return (
    <div className="media-workspace-toolbar">
      <div className="media-workspace-tabs">
        <button
          type="button"
          aria-pressed={!unusedOnly}
          onClick={() => onUnusedOnlyChange(false)}
        >
          {m.media_filter_all()} <span>{totalCount ?? "—"}</span>
        </button>
        <button
          type="button"
          aria-pressed={unusedOnly}
          onClick={() => onUnusedOnlyChange(true)}
        >
          {m.media_unreferenced()} <span>{unusedCount ?? "—"}</span>
        </button>
      </div>
      <div
        className="media-view-switch"
        role="group"
        aria-label={m.media_view_label()}
      >
        {(
          [
            ["grid", LayoutGrid, m.media_view_grid()],
            ["list", List, m.media_view_list()],
          ] as const
        ).map(([value, Icon, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            className={cn(view === value && "selected")}
            onClick={() => onViewChange(value)}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
