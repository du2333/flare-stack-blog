import { Link } from "@tanstack/react-router";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatMonthDayTime } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  formatLengthChange,
  getRevisionReasonLabel,
  type RevisionListItem,
  toRevisionListEntries,
} from "./post-editor-history.shared";

export function PostEditorHistoryList({
  postId,
  revisions,
  isLoading,
  selectedRevisionId,
  onSelect,
}: {
  postId: number;
  revisions: Array<RevisionListItem>;
  isLoading: boolean;
  selectedRevisionId: number | null;
  onSelect?: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-5 py-6 text-sm fuwari-text-50">
        <Spinner size={14} />
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
      {toRevisionListEntries(revisions).map(
        ({ revision, title, lengthChange }) => {
          const selected = revision.id === selectedRevisionId;
          return (
            <Link
              key={revision.id}
              to="/admin/posts/edit/$id/history/$revisionId"
              params={{
                id: String(postId),
                revisionId: String(revision.id),
              }}
              onClick={onSelect}
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
                {getRevisionReasonLabel(
                  revision.reason,
                  revision.restoredFromRevisionId,
                )}
                <span className="fuwari-text-50">
                  {" · "}
                  {lengthChange
                    ? m.editor_history_chars_change({
                        count: revision.contentLength,
                        change: formatLengthChange(lengthChange),
                      })
                    : m.editor_history_chars({ count: revision.contentLength })}
                </span>
              </p>
              {title !== null && (
                <p
                  className={cn(
                    "mt-1 line-clamp-2 text-sm",
                    selected ? "text-(--fuwari-btn-content)" : "fuwari-text-50",
                  )}
                >
                  {title}
                </p>
              )}
            </Link>
          );
        },
      )}
    </div>
  );
}
