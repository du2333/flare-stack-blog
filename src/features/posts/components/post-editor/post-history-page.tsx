import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CircleAlert,
  History,
  LockKeyhole,
  Trash2,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/page-heading";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { PostDiffStatus } from "@/features/posts/components/post-diff/post-diff-status";
import { formatMonthDayTime } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  type HistoryCompare,
  usePostHistory,
  usePostHistoryDiff,
} from "./hooks";
import { PostEditorHistoryDocument } from "./post-editor-history-document";
import { PostEditorHistoryList } from "./post-editor-history-list";

// The diff and the library it uses load when the Changes view is first opened.
const PostDiff = lazy(() =>
  import("@/features/posts/components/post-diff/post-diff").then((module) => ({
    default: module.PostDiff,
  })),
);

type HistoryView = "content" | "diff";

export function PostHistoryPage({
  postId,
  revisionId,
}: {
  postId: number;
  revisionId: number;
}) {
  const navigate = useNavigate();
  // Below 1024px one of the two panes shows at a time.
  const [pane, setPane] = useState<"content" | "list">("content");
  // Both choices stay while the Admin moves between versions: the route keeps
  // this page mounted when `revisionId` changes.
  const [view, setView] = useState<HistoryView>("content");
  const [compareChoice, setCompareChoice] = useState<HistoryCompare>("draft");

  const goEditor = () => {
    void navigate({
      to: "/admin/posts/edit/$id",
      params: { id: String(postId) },
    });
  };

  const goRevision = (nextId: number | null) => {
    if (nextId == null) {
      void navigate({
        to: "/admin/posts/edit/$id/history",
        params: { id: String(postId) },
      });
      return;
    }
    void navigate({
      to: "/admin/posts/edit/$id/history/$revisionId",
      params: { id: String(postId), revisionId: String(nextId) },
    });
  };

  const history = usePostHistory({
    postId,
    selectedRevisionId: revisionId,
    onRestored: goEditor,
    onDeleted: goRevision,
  });

  const changes = usePostHistoryDiff({
    postId,
    selectedRevisionId: revisionId,
    revisions: history.revisions,
    compare: compareChoice,
    enabled: view === "diff",
  });

  const viewingTime = history.selectedRevision
    ? formatMonthDayTime(history.selectedRevision.createdAt)
    : "";

  const canRestore =
    history.selectedRevision != null &&
    !history.isRestoring &&
    !history.isDeleting;

  // After an Edit Conflict, the next restore replaces the newer save, and the
  // confirmation says so.
  const restoreAnyway = history.restoreFailure?.editConflict === true;

  const deleteAction = (
    <Button
      variant="plain"
      tone="danger"
      size="sm"
      onClick={history.requestDelete}
      disabled={!canRestore}
      loading={history.isDeleting}
      icon={<Trash2 size={15} />}
      className="post-history-delete"
    >
      {m.editor_history_delete_action()}
    </Button>
  );

  return (
    <div className="post-editor-workspace overflow-hidden">
      <ConfirmationModal
        isOpen={history.confirm === "restore"}
        onClose={history.cancelConfirm}
        onConfirm={history.confirmRestore}
        title={m.editor_history_restore_title()}
        message={
          restoreAnyway
            ? m.editor_history_restore_anyway_message()
            : m.editor_history_restore_message()
        }
        confirmLabel={
          restoreAnyway
            ? m.editor_history_restore_anyway()
            : m.editor_history_restore_action()
        }
        isLoading={history.isRestoring}
      />
      <ConfirmationModal
        isOpen={history.confirm === "delete"}
        onClose={history.cancelConfirm}
        onConfirm={history.confirmDelete}
        title={m.editor_history_delete_title()}
        message={m.editor_history_delete_message()}
        confirmLabel={m.editor_history_delete_confirm()}
        isLoading={history.isDeleting}
        isDanger
      />

      <header className="post-editor-header post-history-header">
        <Link
          to="/admin/posts/edit/$id"
          params={{ id: String(postId) }}
          className="post-editor-back"
        >
          <ArrowLeft size={17} />
          {m.editor_history_back()}
        </Link>
        <div className="post-history-context">
          <LockKeyhole size={17} />
          <div>
            <h1>{m.editor_history_readonly()}</h1>
            <p>{m.editor_history_restore_hint()}</p>
          </div>
        </div>
        <div className="post-editor-header-actions">
          <Button
            variant="primary"
            onClick={history.requestRestore}
            disabled={!canRestore}
            loading={history.isRestoring}
          >
            {m.editor_history_restore_this()}
          </Button>
        </div>
      </header>
      <SegmentedControl
        aria-label={m.editor_history_list_title()}
        className="post-history-panes lg:hidden"
        size="sm"
        stretch
        value={pane}
        onValueChange={setPane}
        items={[
          { value: "content", label: m.editor_history_pane_content() },
          { value: "list", label: m.editor_history_list_title() },
        ]}
      />
      <div className="post-history-body" data-pane={pane}>
        <section className="post-history-content">
          {history.restoreFailure && (
            <Callout
              role="alert"
              tone={history.restoreFailure.editConflict ? "warning" : "danger"}
              icon={CircleAlert}
              className="post-editor-conflict"
            >
              <strong>{m.editor_history_toast_restore_failed()}</strong>
              <p>{history.restoreFailure.message}</p>
            </Callout>
          )}
          <div className="mx-auto flex w-[min(100%-2rem,var(--post-editor-column))] shrink-0 flex-wrap items-center gap-x-3 gap-y-2 pt-3 pb-1">
            <SegmentedControl
              aria-label={m.editor_history_view_label()}
              size="sm"
              value={view}
              onValueChange={setView}
              items={[
                { value: "content", label: m.editor_history_view_content() },
                { value: "diff", label: m.editor_history_view_diff() },
              ]}
            />
            {view === "diff" && (
              <SegmentedControl
                aria-label={m.editor_history_compare_label()}
                size="sm"
                value={changes.compare}
                onValueChange={setCompareChoice}
                items={[
                  {
                    value: "draft",
                    label: m.editor_history_compare_draft(),
                  },
                  {
                    value: "previous",
                    label: m.editor_history_compare_previous(),
                    disabled: !changes.hasPrevious,
                  },
                ]}
              />
            )}
          </div>
          {view === "content" ? (
            <PostEditorHistoryDocument
              snapshot={history.selectedRevision?.snapshotJson ?? null}
              isLoading={history.isRevisionLoading}
              editorKey={`history:${postId}:${revisionId}`}
              viewingTime={viewingTime}
            />
          ) : (
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-16">
              {changes.diff ? (
                <Suspense fallback={<PostDiffStatus kind="loading" />}>
                  <PostDiff
                    key={`${revisionId}:${changes.compare}`}
                    {...changes.diff}
                  />
                </Suspense>
              ) : (
                <PostDiffStatus kind={changes.isError ? "failed" : "loading"} />
              )}
            </div>
          )}
        </section>
        <aside
          className="post-history-sidebar"
          aria-label={m.editor_history_list_title()}
        >
          <SectionHeading
            className="post-editor-panel-heading"
            size="sm"
            title={m.editor_history_list_title()}
          />
          <PostEditorHistoryList
            postId={postId}
            revisions={history.revisions}
            isLoading={history.isListLoading}
            selectedRevisionId={revisionId}
            onSelect={() => setPane("content")}
          />
          {deleteAction}
        </aside>
      </div>
      {pane === "content" && <div className="lg:hidden">{deleteAction}</div>}
    </div>
  );
}

/** Shown when the Post has no Post Revision, so there is nothing to open. */
export function PostHistoryEmpty({ postId }: { postId: number }) {
  return (
    <div className="post-editor-workspace overflow-hidden">
      <header className="post-editor-header">
        <Link
          to="/admin/posts/edit/$id"
          params={{ id: String(postId) }}
          className="post-editor-back"
        >
          <ArrowLeft size={17} />
          {m.editor_history_back()}
        </Link>
      </header>
      <EmptyState
        className="flex-1"
        icon={History}
        title={m.editor_history_empty_title()}
        description={m.editor_history_empty_desc()}
      />
    </div>
  );
}
