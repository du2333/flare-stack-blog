import { Loader2 } from "lucide-react";
import { cn, formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  getRevisionReasonLabel,
  type RevisionListItem,
} from "./post-editor-history.shared";

interface PostEditorHistoryListProps {
  revisions: Array<RevisionListItem>;
  isLoading: boolean;
  selectedRevisionId: number | null;
  onSelect: (revisionId: number) => void;
  layout: "rail" | "strip";
}

export function PostEditorHistoryList({
  revisions,
  isLoading,
  selectedRevisionId,
  onSelect,
  layout,
}: PostEditorHistoryListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" />
        {m.editor_history_loading()}
      </div>
    );
  }

  if (revisions.length === 0) {
    return (
      <div className="px-4 py-8 text-sm text-muted-foreground/70">
        {m.editor_history_empty()}
      </div>
    );
  }

  if (layout === "strip") {
    return (
      <div className="flex gap-1 overflow-x-auto px-1 py-1">
        {revisions.map((revision) => (
          <button
            key={revision.id}
            type="button"
            onClick={() => onSelect(revision.id)}
            className={cn(
              "shrink-0 border px-3 py-2 text-left text-[11px] font-mono",
              revision.id === selectedRevisionId
                ? "border-foreground bg-foreground text-background"
                : "border-border/40 hover:border-foreground/40",
            )}
          >
            {getRevisionReasonLabel(revision.reason)}
            <span className="mt-1 block opacity-70">
              {formatTimeAgo(revision.createdAt)}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
      {revisions.map((revision) => (
        <button
          key={revision.id}
          type="button"
          onClick={() => onSelect(revision.id)}
          className={cn(
            "mb-2 w-full border px-3 py-3 text-left",
            revision.id === selectedRevisionId
              ? "border-foreground/40 bg-foreground/5"
              : "border-border/30 hover:border-foreground/20",
          )}
        >
          <p className="text-[10px] font-mono text-muted-foreground">
            {getRevisionReasonLabel(revision.reason)} ·{" "}
            {formatTimeAgo(revision.createdAt)}
          </p>
          <p className="mt-2 line-clamp-2 text-sm">
            {revision.title.trim() || m.common_untitled()}
          </p>
        </button>
      ))}
    </div>
  );
}
