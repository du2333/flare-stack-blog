import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useAdminChrome } from "@/components/admin/admin-chrome";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { postRevisionListQuery } from "@/features/posts/queries";
import { formatMonthDayTime } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { usePostHistory } from "./hooks";
import { PostEditorHistoryDocument } from "./post-editor-history-document";
import { PostEditorHistoryList } from "./post-editor-history-list";

export function PostHistoryPage({
  postId,
  revisionId,
}: {
  postId: number;
  revisionId: number;
}) {
  const navigate = useNavigate();
  const { setPrimaryAction, setMobileTitle } = useAdminChrome();

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

  const viewingTime = history.selectedRevision
    ? formatMonthDayTime(history.selectedRevision.createdAt)
    : "";

  const restoreRef = useRef(history.requestRestore);
  restoreRef.current = history.requestRestore;
  const canRestore =
    history.selectedRevision != null &&
    !history.isRestoring &&
    !history.isDeleting;

  useEffect(() => {
    setMobileTitle(m.editor_history_list_title());
    setPrimaryAction({
      label: m.editor_history_restore_this(),
      onClick: () => restoreRef.current(),
      disabled: !canRestore,
    });
  }, [canRestore, setMobileTitle, setPrimaryAction]);

  useEffect(() => {
    return () => {
      setMobileTitle(null);
      setPrimaryAction(null);
    };
  }, [setMobileTitle, setPrimaryAction]);

  const actions = (
    <div className="flex shrink-0 items-center gap-2 px-5 pt-5 pb-3">
      <Link
        to="/admin/posts/edit/$id/history"
        params={{ id: String(postId) }}
        className="inline-flex h-9 items-center rounded-xl px-2 text-sm fuwari-text-50 hover:text-(--fuwari-primary) lg:hidden"
      >
        {m.common_back()}
      </Link>
      <Link
        to="/admin/posts/edit/$id"
        params={{ id: String(postId) }}
        className="hidden h-9 items-center rounded-xl px-2 text-sm fuwari-text-50 hover:text-(--fuwari-primary) lg:inline-flex"
      >
        {m.editor_history_back()}
      </Link>
      <span className="min-w-0 flex-1" />
      <button
        type="button"
        onClick={history.requestDelete}
        disabled={
          history.selectedRevision == null ||
          history.isDeleting ||
          history.isRestoring
        }
        className="h-9 rounded-xl px-3 text-sm text-(--fuwari-danger-fg) disabled:opacity-40"
      >
        {history.isDeleting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          m.editor_history_delete_action()
        )}
      </button>
      <button
        type="button"
        onClick={history.requestRestore}
        disabled={
          history.selectedRevision == null ||
          history.isRestoring ||
          history.isDeleting
        }
        className="hidden h-9 items-center rounded-xl px-4 text-sm font-medium fuwari-btn-primary disabled:opacity-40 lg:inline-flex"
      >
        {history.isRestoring ? (
          <Loader2 size={14} className="mr-1.5 animate-spin" />
        ) : null}
        {m.editor_history_restore_this()}
      </button>
    </div>
  );

  const banner = viewingTime ? (
    <div className="mx-5 mb-4 rounded-xl bg-(--fuwari-warning-bg) px-4 py-3">
      <p className="text-sm font-medium text-(--fuwari-warning-fg)">
        {m.editor_history_banner_title({ time: viewingTime })}
      </p>
      <p className="mt-1 text-sm fuwari-text-50">
        {m.editor_history_banner_hint()}
      </p>
    </div>
  ) : null;

  const list = (
    <>
      <p className="hidden shrink-0 px-5 pt-5 pb-2 text-sm font-medium fuwari-text-90 lg:block">
        {m.editor_history_list_title()}
      </p>
      <PostEditorHistoryList
        postId={postId}
        revisions={history.revisions}
        isLoading={history.isListLoading}
        selectedRevisionId={revisionId}
      />
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <ConfirmationModal
        isOpen={history.confirm === "restore"}
        onClose={history.cancelConfirm}
        onConfirm={history.confirmRestore}
        title={m.editor_history_restore_title()}
        message={m.editor_history_restore_message()}
        confirmLabel={m.editor_history_restore_action()}
        isLoading={history.isRestoring}
      />
      <ConfirmationModal
        isOpen={history.confirm === "delete"}
        onClose={history.cancelConfirm}
        onConfirm={history.confirmDelete}
        title={m.editor_history_delete_title()}
        message={m.editor_history_delete_message()}
        confirmLabel={m.editor_history_delete_action()}
        isLoading={history.isDeleting}
        isDanger
      />

      <div className="fuwari-card-base lg:hidden">{actions}</div>
      <div className="lg:hidden">{banner}</div>

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        <section className="fuwari-card-base flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="hidden lg:block">{actions}</div>
          <div className="hidden lg:block">{banner}</div>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5 pb-8 md:px-8 lg:pt-0">
            <PostEditorHistoryDocument
              snapshot={history.selectedRevision?.snapshotJson ?? null}
              isLoading={history.isRevisionLoading}
              editorKey={`history:${postId}:${revisionId}`}
            />
          </div>
        </section>
        <aside className="fuwari-card-base hidden min-h-0 w-72 shrink-0 flex-col overflow-hidden lg:flex xl:w-80">
          {list}
        </aside>
      </div>
    </div>
  );
}

export function PostHistoryIndex({ postId }: { postId: number }) {
  const { setPrimaryAction, setMobileTitle } = useAdminChrome();
  const { data: revisions = [], isLoading } = useQuery(
    postRevisionListQuery(postId),
  );

  useEffect(() => {
    setMobileTitle(m.editor_history_list_title());
    setPrimaryAction(null);
    return () => {
      setMobileTitle(null);
    };
  }, [setMobileTitle, setPrimaryAction]);

  return (
    <div className="fuwari-card-base flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center px-5 pt-5 pb-3">
        <Link
          to="/admin/posts/edit/$id"
          params={{ id: String(postId) }}
          className="inline-flex h-9 items-center rounded-xl px-2 text-sm fuwari-text-50 hover:text-(--fuwari-primary)"
        >
          {m.editor_history_back()}
        </Link>
      </div>
      <h1 className="hidden px-5 pb-2 text-2xl font-medium fuwari-text-90 lg:block">
        {m.editor_history_list_title()}
      </h1>
      <PostEditorHistoryList
        postId={postId}
        revisions={revisions}
        isLoading={isLoading}
        selectedRevisionId={null}
      />
    </div>
  );
}
