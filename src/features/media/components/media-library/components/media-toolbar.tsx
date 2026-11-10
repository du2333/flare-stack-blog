import { LayoutGrid, List } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Tabs } from "@/components/ui/tabs";
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
    <div className="media-workspace-toolbar admin-frame-toolbar">
      <Tabs
        className="media-workspace-tabs"
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
      <SegmentedControl
        className="media-view-switch"
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
              {label}
            </>
          ),
        }))}
      />
    </div>
  );
}
