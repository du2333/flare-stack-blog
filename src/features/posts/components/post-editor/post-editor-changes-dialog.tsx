import { X } from "lucide-react";
import { lazy, Suspense } from "react";
import { FuwariModal } from "@/components/ui/fuwari-modal";
import { IconButton } from "@/components/ui/icon-button";
import { PostDiffStatus } from "@/features/posts/components/post-diff/post-diff-status";
import { m } from "@/paraglide/messages";
import type { PostChanges } from "./hooks/use-post-changes";

// The diff library loads when the dialog first shows a diff, not with the
// editor.
const PostDiff = lazy(() =>
  import("@/features/posts/components/post-diff/post-diff").then((module) => ({
    default: module.PostDiff,
  })),
);

/**
 * The Unpublished Changes of a post in a dialog: the published version
 * against the current draft, scrolling inside the dialog.
 */
export function PostEditorChangesDialog({
  open,
  changes,
  onClose,
  returnFocus,
}: {
  open: boolean;
  changes: PostChanges;
  onClose: () => void;
  returnFocus: () => HTMLElement | null;
}) {
  return (
    <FuwariModal
      open={open}
      onClose={onClose}
      labelledBy="post-editor-changes-title"
      returnFocus={returnFocus}
      className="fuwari-modal-wide"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h2
            id="post-editor-changes-title"
            className="text-lg font-medium fuwari-text-90"
          >
            {m.editor_changes_title()}
          </h2>
          <IconButton label={m.common_close()} size="md" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {changes.status === "ready" ? (
            <Suspense fallback={<PostDiffStatus kind="loading" />}>
              <PostDiff
                before={changes.before}
                after={changes.after}
                beforeName={m.editor_changes_side_published()}
                afterName={m.editor_changes_side_draft()}
                emptyText={m.editor_changes_same()}
              />
            </Suspense>
          ) : changes.status === "loading" ? (
            <PostDiffStatus kind="loading" />
          ) : (
            <PostDiffStatus
              kind="failed"
              failedText={
                changes.status === "save-failed"
                  ? m.editor_changes_save_failed()
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </FuwariModal>
  );
}
