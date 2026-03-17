import { Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatDate, formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  getRevisionReasonColorClass,
  getRevisionReasonIcon,
  getRevisionReasonLabel,
  type RevisionListItem,
} from "./post-editor-history.shared";

interface PostEditorHistoryListProps {
  revisions: Array<RevisionListItem>;
  isLoading: boolean;
  selectedRevisionId: number | null;
  selectedRevisionIds: Array<number>;
  isDeleting: boolean;
  onSelect: (revisionId: number) => void;
  onToggleSelection: (revisionId: number, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onDeleteSelected: () => void;
}

export function PostEditorHistoryList({
  revisions,
  isLoading,
  selectedRevisionId,
  selectedRevisionIds,
  isDeleting,
  onSelect,
  onToggleSelection,
  onToggleSelectAll,
  onDeleteSelected,
}: PostEditorHistoryListProps) {
  const allSelected =
    revisions.length > 0 && selectedRevisionIds.length === revisions.length;

  return (
    <div className="min-h-0 border-b border-border/30 lg:border-r lg:border-b-0">
      <div className="border-b border-border/30 px-4 py-3 space-y-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/60">
          {m.editor_history_list_title()}
        </p>

        {revisions.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground/80">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleSelectAll}
                aria-label={m.editor_history_select_all()}
              />
              <span>
                {selectedRevisionIds.length > 0
                  ? m.editor_history_selected_count({
                      count: String(selectedRevisionIds.length),
                    })
                  : m.editor_history_select_all()}
              </span>
            </label>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-none px-2 text-destructive hover:text-destructive"
              disabled={selectedRevisionIds.length === 0 || isDeleting}
              onClick={onDeleteSelected}
            >
              <Trash2 size={14} />
              <span className="ml-2">{m.editor_history_delete_selected()}</span>
            </Button>
          </div>
        )}
      </div>

      <div className="custom-scrollbar h-full overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            {m.editor_history_loading()}
          </div>
        ) : revisions.length > 0 ? (
          revisions.map((revision) => {
            const isActive = revision.id === selectedRevisionId;
            const isChecked = selectedRevisionIds.includes(revision.id);
            return (
              <div
                key={revision.id}
                className={cn(
                  "mb-2 border px-4 py-3 transition-colors",
                  isActive
                    ? "border-foreground/40 bg-foreground/5"
                    : "border-border/30 hover:border-foreground/20 hover:bg-muted/30",
                )}
              >
                <div className="mb-3 flex items-start gap-3">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      onToggleSelection(revision.id, checked)
                    }
                    aria-label={m.editor_history_select_revision()}
                    className="mt-1"
                  />

                  <button
                    type="button"
                    onClick={() => onSelect(revision.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      {(() => {
                        const ReasonIcon = getRevisionReasonIcon(
                          revision.reason,
                        );
                        return (
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 gap-1 rounded-sm",
                              getRevisionReasonColorClass(revision.reason),
                            )}
                          >
                            <ReasonIcon size={12} />
                            {getRevisionReasonLabel(revision.reason)}
                          </Badge>
                        );
                      })()}
                      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/55">
                        {formatTimeAgo(revision.createdAt)}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-sm font-medium text-foreground">
                      {revision.title.trim() || m.common_untitled()}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground/75">
                      {revision.summary?.trim() ||
                        m.editor_history_no_summary()}
                    </p>
                    <p className="mt-3 text-[11px] font-mono text-muted-foreground/55">
                      {formatDate(revision.createdAt, { includeTime: true })}
                    </p>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-4 py-8 text-sm text-muted-foreground/70">
            {m.editor_history_empty()}
          </div>
        )}
      </div>
    </div>
  );
}
