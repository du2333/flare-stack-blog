import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { cn, formatMonthDayTime } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  getRevisionReasonLabel,
  type RevisionListItem,
} from "./post-editor-history.shared";

export function PostEditorHistoryList({
  postId,
  revisions,
  isLoading,
  selectedRevisionId,
}: {
  postId: number;
  revisions: Array<RevisionListItem>;
  isLoading: boolean;
  selectedRevisionId: number | null;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-5 py-6 text-sm fuwari-text-50">
        <Loader2 size={14} className="animate-spin" />
        {m.editor_history_loading()}
      </div>
    );
  }

  if (revisions.length === 0) {
    return (
      <p className="px-5 py-8 text-sm fuwari-text-50">
        {m.editor_history_empty()}
      </p>
    );
  }

  return (
    <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
      {revisions.map((revision) => {
        const selected = revision.id === selectedRevisionId;
        return (
          <Link
            key={revision.id}
            to="/admin/posts/edit/$id/history/$revisionId"
            params={{
              id: String(postId),
              revisionId: String(revision.id),
            }}
            className={cn(
              "block rounded-xl px-3 py-3 text-left transition-colors",
              selected
                ? "bg-(--fuwari-btn-regular-bg) text-(--fuwari-primary)"
                : "hover:bg-(--fuwari-btn-regular-bg)/60",
            )}
          >
            <p className="text-sm font-medium">
              {getRevisionReasonLabel(revision.reason)} ·{" "}
              {formatMonthDayTime(revision.createdAt)}
            </p>
            <p
              className={cn(
                "mt-1 line-clamp-2 text-sm",
                selected ? "text-(--fuwari-btn-content)" : "fuwari-text-50",
              )}
            >
              {revision.title.trim() || m.common_untitled()}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
