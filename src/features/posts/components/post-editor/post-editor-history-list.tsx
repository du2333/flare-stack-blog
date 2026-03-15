import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate, formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  getRevisionReasonLabel,
  getRevisionReasonVariant,
  type RevisionListItem,
} from "./post-editor-history.shared";

interface PostEditorHistoryListProps {
  revisions: Array<RevisionListItem>;
  isLoading: boolean;
  selectedRevisionId: number | null;
  onSelect: (revisionId: number) => void;
}

export function PostEditorHistoryList({
  revisions,
  isLoading,
  selectedRevisionId,
  onSelect,
}: PostEditorHistoryListProps) {
  return (
    <div className="min-h-0 border-b border-border/30 lg:border-r lg:border-b-0">
      <div className="border-b border-border/30 px-4 py-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/60">
          {m.editor_history_list_title()}
        </p>
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
            return (
              <button
                key={revision.id}
                type="button"
                onClick={() => onSelect(revision.id)}
                className={cn(
                  "mb-2 w-full border px-4 py-3 text-left transition-colors",
                  isActive
                    ? "border-foreground/40 bg-foreground/5"
                    : "border-border/30 hover:border-foreground/20 hover:bg-muted/30",
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Badge
                    variant={getRevisionReasonVariant(revision.reason)}
                    className="shrink-0"
                  >
                    {getRevisionReasonLabel(revision.reason)}
                  </Badge>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/55">
                    {formatTimeAgo(revision.createdAt)}
                  </span>
                </div>

                <p className="line-clamp-2 text-sm font-medium text-foreground">
                  {revision.title.trim() || m.common_untitled()}
                </p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground/75">
                  {revision.summary?.trim() || m.editor_history_no_summary()}
                </p>
                <p className="mt-3 text-[11px] font-mono text-muted-foreground/55">
                  {formatDate(revision.createdAt, { includeTime: true })}
                </p>
              </button>
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
