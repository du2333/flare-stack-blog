import { useQuery } from "@tanstack/react-query";
import { useBlocker } from "@tanstack/react-router";
import type { JSONContent, Editor as TiptapEditor } from "@tiptap/react";
import { History, Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Editor } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { extensions } from "@/features/posts/editor/config";
import type { PostRevisionSnapshot } from "@/features/posts/schema/post-revisions.schema";
import { tagsAdminQueryOptions } from "@/features/tags/queries";
import { m } from "@/paraglide/messages";
import { EditorTableOfContents } from "./editor-table-of-contents";
import { useAutoSave, usePostActions } from "./hooks";
import { PostEditorHeader } from "./post-editor-header";
import { PostEditorHistoryPanel } from "./post-editor-history-panel";
import { PostEditorMetadata } from "./post-editor-metadata";
import { PostEditorStatusBar } from "./post-editor-status-bar";
import type { PostEditorData, PostEditorProps } from "./types";

export function PostEditor({ initialData, onSave }: PostEditorProps) {
  // Initialize post state from initialData (always provided)
  const [post, setPost] = useState<PostEditorData>(() => ({
    title: initialData.title,
    summary: initialData.summary,
    slug: initialData.slug,
    status: initialData.status,
    readTimeInMinutes: initialData.readTimeInMinutes,
    contentJson: initialData.contentJson ?? null,
    publishedAt: initialData.publishedAt,
    pinnedAt: initialData.pinnedAt,
    tagIds: initialData.tagIds,
    isSynced: initialData.isSynced,
    hasPublicCache: initialData.hasPublicCache,
  }));

  // Sync state when initialData updates (e.g. after background refetch/invalidation)
  const [prevInitialDataId, setPrevInitialDataId] = useState(initialData.id);
  const [prevTagIds, setPrevTagIds] = useState(() =>
    [...initialData.tagIds].sort().join(","),
  );

  const currentTagIdsStr = [...initialData.tagIds].sort().join(",");

  if (prevInitialDataId !== initialData.id || prevTagIds !== currentTagIdsStr) {
    setPrevInitialDataId(initialData.id);
    setPrevTagIds(currentTagIdsStr);
    setPost((prev) => ({
      ...prev,
      tagIds: initialData.tagIds,
      isSynced: initialData.isSynced,
    }));
  }

  const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(
    null,
  );
  const [editorRenderKey, setEditorRenderKey] = useState(
    `editor:${initialData.id}`,
  );
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Fetch all tags for AI context and matching
  const { data: allTags = [] } = useQuery(tagsAdminQueryOptions());

  // Auto-save hook
  const useAutoSaveReturn = useAutoSave({
    post,
    onSave,
  });

  const { saveStatus, lastSaved, setError, markSaved } = useAutoSaveReturn;

  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => saveStatus === "SAVING",
    withResolver: true,
  });

  // Post actions hook
  const {
    isGeneratingSlug,
    isCalculatingReadTime,
    isGeneratingSummary,
    handleGenerateSlug,
    handleCalculateReadTime,
    handleGenerateSummary,
    handleProcessData,
    processState,
    isGeneratingTags,
    handleGenerateTags,
    isDirty: isPostDirty,
    contentStats,
  } = usePostActions({
    postId: initialData.id,
    post,
    initialData,
    setPost,
    setError,
    allTags,
  });

  const handleContentChange = useCallback((json: JSONContent) => {
    setPost((prev) => ({ ...prev, contentJson: json }));
  }, []);

  const handlePostChange = useCallback((updates: Partial<PostEditorData>) => {
    setPost((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleRestoreApplied = useCallback(
    ({
      snapshot,
    }: {
      snapshot: {
        title: string;
        summary: string | null;
        slug: string;
        status: PostEditorData["status"];
        publishedAt: string | null;
        readTimeInMinutes: number;
        contentJson: PostEditorData["contentJson"];
        tagIds: Array<number>;
      };
    }) => {
      const hasPublicCache = post.hasPublicCache;
      const restoredPost: PostEditorData = {
        title: snapshot.title,
        summary: snapshot.summary ?? "",
        slug: snapshot.slug,
        status: snapshot.status,
        readTimeInMinutes: snapshot.readTimeInMinutes,
        contentJson: snapshot.contentJson,
        publishedAt: snapshot.publishedAt
          ? new Date(snapshot.publishedAt)
          : null,
        pinnedAt: post.pinnedAt,
        tagIds: snapshot.tagIds,
        isSynced: snapshot.status === "draft" ? !hasPublicCache : false,
        hasPublicCache,
      };

      setPost(restoredPost);
      setEditorRenderKey(`editor:${initialData.id}:${Date.now()}`);
      markSaved(restoredPost);
    },
    [initialData.id, markSaved, post.hasPublicCache],
  );

  const currentSnapshot = useMemo<PostRevisionSnapshot>(
    () => ({
      title: post.title,
      summary: post.summary.trim() || null,
      slug: post.slug,
      status: post.status,
      publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
      readTimeInMinutes: post.readTimeInMinutes,
      contentJson: post.contentJson,
      tagIds: [...new Set(post.tagIds)].sort((a, b) => a - b),
    }),
    [
      post.contentJson,
      post.publishedAt,
      post.readTimeInMinutes,
      post.slug,
      post.status,
      post.summary,
      post.tagIds,
      post.title,
    ],
  );

  return (
    <div className="fixed inset-0 z-80 flex flex-col bg-background overflow-hidden">
      <ConfirmationModal
        isOpen={status === "blocked"}
        onClose={() => reset?.()}
        onConfirm={() => proceed?.()}
        title={m.editor_leave_title()}
        message={m.editor_leave_message()}
        confirmLabel={m.editor_leave_confirm()}
      />

      <PostEditorHeader
        post={post}
        saveStatus={saveStatus}
        processState={processState}
        isPostDirty={isPostDirty}
        onPreview={() => {
          if (post.slug) window.open(`/post/${post.slug}`, "_blank");
        }}
        onProcess={handleProcessData}
      />

      <PostEditorHistoryPanel
        postId={initialData.id}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        currentSnapshot={currentSnapshot}
        allTags={allTags}
        onRestoreApplied={handleRestoreApplied}
      />

      {/* Main Content Area (Only this scrolls) */}
      <div
        id="post-editor-scroll-container"
        className="flex-1 overflow-y-auto custom-scrollbar relative scroll-smooth animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both delay-100"
      >
        <div className="w-full mx-auto py-20 px-6 md:px-12 grid grid-cols-1 xl:grid-cols-[1fr_240px] 2xl:grid-cols-[1fr_56rem_1fr] gap-12 items-start">
          <div className="hidden 2xl:block" />
          <div className="min-w-0 w-full max-w-4xl mx-auto 2xl:mx-0">
            <div className="mb-6 flex justify-end xl:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsHistoryOpen(true)}
                className="rounded-none text-[10px] font-mono uppercase tracking-[0.18em]"
              >
                <History size={14} />
                <span className="ml-2">{m.editor_history_open()}</span>
              </Button>
            </div>

            <PostEditorMetadata
              post={post}
              isGeneratingSlug={isGeneratingSlug}
              isCalculatingReadTime={isCalculatingReadTime}
              isGeneratingSummary={isGeneratingSummary}
              isGeneratingTags={isGeneratingTags}
              onPostChange={handlePostChange}
              onGenerateSlug={handleGenerateSlug}
              onCalculateReadTime={handleCalculateReadTime}
              onGenerateSummary={handleGenerateSummary}
              onGenerateTags={handleGenerateTags}
            />

            {/* Editor Area */}
            <div className="min-h-[60vh] pb-32">
              <Editor
                key={editorRenderKey}
                extensions={extensions}
                content={post.contentJson ?? ""}
                onChange={handleContentChange}
                onCreated={setEditorInstance}
              />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="hidden xl:block sticky top-20 h-full max-h-[calc(100vh-10rem)] w-60">
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
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
