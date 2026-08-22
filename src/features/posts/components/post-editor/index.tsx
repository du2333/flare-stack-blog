import { useQuery } from "@tanstack/react-query";
import { useBlocker } from "@tanstack/react-router";
import type { JSONContent, Editor as TiptapEditor } from "@tiptap/react";
import { History, Loader2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Editor } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { extensions } from "@/features/posts/editor/config";
import { convertToPlainText } from "@/features/posts/utils/content";
import type { PostRevisionSnapshot } from "@/features/posts/schema/post-revisions.schema";
import { tagsAdminQueryOptions } from "@/features/tags/queries";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { EditorTableOfContents } from "./editor-table-of-contents";
import { useAutoSave, usePostActions, usePostHistory } from "./hooks";
import { contentStatsFromText } from "./post-editor.model";
import { PostEditorHeader } from "./post-editor-header";
import { PostEditorHistoryDocument } from "./post-editor-history-document";
import { PostEditorHistoryList } from "./post-editor-history-list";
import { toDateOrNull } from "./post-editor-history.shared";
import { PostEditorMetadata } from "./post-editor-metadata";
import { PostEditorStatusBar } from "./post-editor-status-bar";
import type { PostEditorData, PostEditorProps } from "./types";

export function PostEditor({ initialData, onSave }: PostEditorProps) {
  const [post, setPost] = useState<PostEditorData>(() => ({
    title: initialData.title,
    summary: initialData.summary,
    slug: initialData.slug,
    contentJson: initialData.contentJson ?? null,
    publishedAt: initialData.publishedAt,
    pinnedAt: initialData.pinnedAt,
    tagIds: initialData.tagIds,
    hasPublicSnapshot: initialData.hasPublicSnapshot,
    serverToday: initialData.serverToday,
  }));
  const [editorContent, setEditorContent] = useState<JSONContent | null>(
    () => initialData.contentJson ?? null,
  );
  const [contentEpoch, setContentEpoch] = useState(0);
  const [contentStats, setContentStats] = useState(() =>
    contentStatsFromText(convertToPlainText(initialData.contentJson ?? null)),
  );
  const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(
    null,
  );
  const [editorRenderKey, setEditorRenderKey] = useState(
    `editor:${initialData.id}`,
  );
  const [isInspecting, setIsInspecting] = useState(false);

  const editorRef = useRef<TiptapEditor | null>(null);
  const editorContentRef = useRef(editorContent);
  editorContentRef.current = editorContent;
  editorRef.current = editorInstance;

  const { data: allTags = [] } = useQuery(tagsAdminQueryOptions());

  const getContent = useCallback(() => {
    const editor = editorRef.current;
    if (editor && !editor.isDestroyed) {
      return editor.getJSON();
    }
    return editorContentRef.current;
  }, []);

  const {
    saveStatus,
    lastSaved,
    setError,
    markSaved,
    flush,
    waitForInFlightSave,
    discardInFlightSave,
  } = useAutoSave({
    post,
    getContent,
    contentEpoch,
    onSave,
    enabled: !isInspecting,
  });

  const sampleEditorContent = useCallback(() => {
    const json = getContent();
    editorContentRef.current = json;
    setEditorContent(json);
    setPost((prev) => ({ ...prev, contentJson: json }));
    return json;
  }, [getContent]);

  const handleRestoreApplied = useCallback(
    (snapshot: PostRevisionSnapshot) => {
      const restoredPost: PostEditorData = {
        title: snapshot.title,
        summary: snapshot.summary ?? "",
        slug: snapshot.slug,
        contentJson: snapshot.contentJson,
        publishedAt: toDateOrNull(snapshot.publishedAt),
        pinnedAt: post.pinnedAt,
        tagIds: snapshot.tagIds,
        hasPublicSnapshot: post.hasPublicSnapshot,
        serverToday: post.serverToday,
      };

      editorContentRef.current = snapshot.contentJson;
      setEditorContent(snapshot.contentJson);
      setPost(restoredPost);
      setContentEpoch(0);
      setContentStats(contentStatsFromText(""));
      setEditorRenderKey(`editor:${initialData.id}:${Date.now()}`);
      markSaved(restoredPost, 0);
    },
    [
      initialData.id,
      markSaved,
      post.hasPublicSnapshot,
      post.pinnedAt,
      post.serverToday,
    ],
  );

  const beforeRestore = useCallback(async () => {
    await waitForInFlightSave();
    discardInFlightSave();
  }, [discardInFlightSave, waitForInFlightSave]);

  const history = usePostHistory({
    postId: initialData.id,
    isInspecting,
    onInspectingChange: setIsInspecting,
    onRestoreApplied: handleRestoreApplied,
    beforeRestore,
  });

  const openHistory = useCallback(() => {
    sampleEditorContent();
    history.openHistory();
  }, [history, sampleEditorContent]);

  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => saveStatus !== "SYNCED",
    withResolver: true,
  });

  const {
    isGeneratingSlug,
    handleGenerateSlug,
    handlePublish,
    handleUnpublish,
    processState,
    canPublish,
    lockSlug,
  } = usePostActions({
    postId: initialData.id,
    post,
    setPost,
    setError,
    flush,
  });

  const handleEditorCreated = useCallback((editor: TiptapEditor | null) => {
    editorRef.current = editor;
    setEditorInstance(editor);
    if (editor) {
      setContentStats(contentStatsFromText(editor.getText()));
    }
  }, []);

  const handleEditorUpdate = useCallback((editor: TiptapEditor) => {
    setContentEpoch((epoch) => epoch + 1);
    setContentStats(contentStatsFromText(editor.getText()));
  }, []);

  const handlePostChange = useCallback(
    (updates: Partial<PostEditorData>) => {
      if (updates.slug !== undefined) {
        lockSlug();
      }
      setPost((prev) => ({ ...prev, ...updates }));
    },
    [lockSlug],
  );

  const historyTagNames = useMemo(() => {
    if (!history.selectedRevision) return [];
    const tagMap = new Map(allTags.map((tag) => [tag.id, tag.name]));
    return history.selectedRevision.snapshotJson.tagIds
      .map((tagId) => tagMap.get(tagId))
      .filter((tagName): tagName is string => Boolean(tagName));
  }, [allTags, history.selectedRevision]);

  const viewingTime = history.selectedRevision
    ? formatDate(history.selectedRevision.createdAt, { includeTime: true })
    : "";

  return (
    <div className="fixed inset-0 z-80 flex flex-col overflow-hidden bg-background">
      <ConfirmationModal
        isOpen={status === "blocked"}
        onClose={() => reset?.()}
        onConfirm={() => proceed?.()}
        title={m.editor_leave_title()}
        message={m.editor_leave_message()}
        confirmLabel={m.editor_leave_confirm()}
      />
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

      <PostEditorHeader
        post={post}
        processState={processState}
        canPublish={canPublish}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        isInspecting={history.isInspecting}
        canRestore={history.selectedRevision != null}
        isRestoring={history.isRestoring}
        isDeleting={history.isDeleting}
        onExitHistory={history.exitInspect}
        onRestore={history.requestRestore}
        onDelete={history.requestDelete}
      />

      {history.isInspecting && history.selectedRevision && (
        <div className="border-b border-amber-500/40 bg-amber-500/10 px-6 py-3">
          <p className="text-sm font-medium">
            {m.editor_history_banner_title({ time: viewingTime })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {m.editor_history_banner_hint()}
          </p>
        </div>
      )}

      {history.isInspecting && (
        <div className="border-b border-border/30 px-4 py-2 xl:hidden">
          <PostEditorHistoryList
            revisions={history.revisions}
            isLoading={history.isListLoading}
            selectedRevisionId={history.selectedRevisionId}
            onSelect={history.selectRevision}
            layout="strip"
          />
        </div>
      )}

      <div
        id="post-editor-scroll-container"
        className="custom-scrollbar relative flex-1 scroll-smooth overflow-y-auto animate-in fade-in slide-in-from-bottom-4 fill-mode-both delay-100 duration-1000"
      >
        <div className="mx-auto grid w-full grid-cols-1 items-start gap-12 px-6 py-20 md:px-12 xl:grid-cols-[1fr_240px] 2xl:grid-cols-[1fr_56rem_1fr]">
          <div className="hidden 2xl:block" />
          <div className="mx-auto min-w-0 w-full max-w-4xl 2xl:mx-0">
            {history.isInspecting ? (
              <PostEditorHistoryDocument
                snapshot={history.selectedRevision?.snapshotJson ?? null}
                tagNames={historyTagNames}
                isLoading={history.isRevisionLoading}
                editorKey={`history:${initialData.id}:${history.selectedRevisionId ?? "none"}`}
              />
            ) : (
              <>
                <div className="mb-6 flex justify-end xl:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openHistory}
                    className="rounded-none text-[10px] font-mono uppercase tracking-[0.18em]"
                  >
                    <History size={14} />
                    <span className="ml-2">{m.editor_history_open()}</span>
                  </Button>
                </div>

                <PostEditorMetadata
                  post={post}
                  isGeneratingSlug={isGeneratingSlug}
                  onPostChange={handlePostChange}
                  onGenerateSlug={handleGenerateSlug}
                />

                <div className="min-h-[60vh] pb-32">
                  <Editor
                    key={editorRenderKey}
                    extensions={extensions}
                    content={editorContent ?? ""}
                    onUpdate={handleEditorUpdate}
                    onCreated={handleEditorCreated}
                  />
                </div>
              </>
            )}
          </div>

          <aside className="sticky top-20 hidden h-full max-h-[calc(100vh-10rem)] w-60 xl:block">
            {history.isInspecting ? (
              <div className="flex h-full flex-col border border-border/30">
                <p className="border-b border-border/30 px-4 py-3 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                  {m.editor_history_list_title()}
                </p>
                <PostEditorHistoryList
                  revisions={history.revisions}
                  isLoading={history.isListLoading}
                  selectedRevisionId={history.selectedRevisionId}
                  onSelect={history.selectRevision}
                  layout="rail"
                />
              </div>
            ) : (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={openHistory}
                  className="flex w-full items-center justify-between border border-border/30 px-4 py-3 text-left transition-colors hover:border-foreground/20 hover:bg-muted/30"
                >
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/55">
                      {m.editor_history_eyebrow()}
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {m.editor_history_title()}
                    </p>
                  </div>
                  {saveStatus === "SAVING" ? (
                    <Loader2
                      size={14}
                      className="animate-spin text-muted-foreground"
                    />
                  ) : (
                    <History size={16} className="text-muted-foreground" />
                  )}
                </button>

                {editorInstance && (
                  <EditorTableOfContents editor={editorInstance} />
                )}
              </div>
            )}
          </aside>
        </div>
      </div>

      <PostEditorStatusBar
        chars={contentStats.chars}
        words={contentStats.words}
        saveStatus={saveStatus}
        lastSaved={lastSaved}
      />
    </div>
  );
}
