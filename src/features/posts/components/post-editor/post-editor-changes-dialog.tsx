import { CircleAlert } from "lucide-react";
import { lazy, Suspense } from "react";
import { Callout } from "@/components/ui/callout";
import { FuwariModal } from "@/components/ui/fuwari-modal";
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
  slugWithheld,
  onClose,
  returnFocus,
}: {
  open: boolean;
  changes: PostChanges;
  /** Autosave leaves the link out, so the diff has the saved one. */
  slugWithheld: boolean;
  onClose: () => void;
  returnFocus: () => HTMLElement | null;
}) {
  return (
    <FuwariModal
      open={open}
      onClose={onClose}
      title={m.editor_changes_title()}
      returnFocus={returnFocus}
      className="fuwari-modal-wide"
    >
      {changes.status === "ready" ? (
        <>
          {slugWithheld ? (
            <Callout
              tone="warning"
              icon={CircleAlert}
              className="mb-4"
              role="status"
            >
              {m.editor_changes_slug_withheld()}
            </Callout>
          ) : null}
          <Suspense fallback={<PostDiffStatus kind="loading" />}>
            <PostDiff
              before={changes.before}
              after={changes.after}
              beforeName={m.editor_changes_side_published()}
              afterName={m.editor_changes_side_draft()}
              emptyText={m.editor_changes_same()}
            />
          </Suspense>
        </>
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
    </FuwariModal>
  );
}
