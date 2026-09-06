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
    <div className="post-history-list custom-scrollbar">
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
            aria-current={selected ? "page" : undefined}
            className={cn(
              "post-history-version",
              selected
                ? "is-selected bg-(--fuwari-btn-regular-bg) text-(--fuwari-primary)"
                : "hover:bg-(--fuwari-btn-regular-bg)/60",
            )}
          >
            <time
              dateTime={revision.createdAt.toISOString()}
              className="block text-sm font-medium"
            >
              {formatMonthDayTime(revision.createdAt)}
            </time>
            <p className="mt-1 text-sm">
              {getRevisionReasonLabel(revision.reason)}
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
