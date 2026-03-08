import { useBlocker } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useAutoSave, usePostActions } from "./hooks";
import { EditorTableOfContents } from "./editor-table-of-contents";
import { PostEditorHeader } from "./post-editor-header";
import { PostEditorMetadata } from "./post-editor-metadata";
import { PostEditorStatusBar } from "./post-editor-status-bar";
import type { JSONContent, Editor as TiptapEditor } from "@tiptap/react";
import type { PostEditorData, PostEditorProps } from "./types";
import { tagsAdminQueryOptions } from "@/features/tags/queries";
import { Editor } from "@/components/tiptap-editor";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { extensions } from "@/features/posts/editor/config";

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

  // Fetch all tags for AI context and matching
  const { data: allTags = [] } = useQuery(tagsAdminQueryOptions());

  // Auto-save hook
  const useAutoSaveReturn = useAutoSave({
    post,
    onSave,
  });

  const { saveStatus, lastSaved, setError } = useAutoSaveReturn;

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

  return (
    <div className="fixed inset-0 z-80 flex flex-col bg-background overflow-hidden">
      <ConfirmationModal
        isOpen={status === "blocked"}
        onClose={() => reset?.()}
        onConfirm={() => proceed?.()}
        title="离开页面？"
        message="您有正在保存的更改。离开可能会导致部分数据丢失。"
        confirmLabel="确认离开"
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

      {/* Main Content Area (Only this scrolls) */}
      <div
        id="post-editor-scroll-container"
        className="flex-1 overflow-y-auto custom-scrollbar relative scroll-smooth animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both delay-100"
      >
        <div className="w-full mx-auto py-20 px-6 md:px-12 grid grid-cols-1 xl:grid-cols-[1fr_240px] 2xl:grid-cols-[1fr_56rem_1fr] gap-12 items-start">
          <div className="hidden 2xl:block" />
          <div className="min-w-0 w-full max-w-4xl mx-auto 2xl:mx-0">
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
                key={initialData.id}
                extensions={extensions}
                content={initialData.contentJson ?? ""}
                onChange={handleContentChange}
                onCreated={setEditorInstance}
              />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="hidden xl:block sticky top-20 h-full max-h-[calc(100vh-10rem)] w-60">
            {editorInstance && (
              <EditorTableOfContents editor={editorInstance} />
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
