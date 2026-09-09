import { useQueryClient } from "@tanstack/react-query";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import type { JSONContent, Editor as TiptapEditor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAdminChrome } from "@/components/admin/admin-chrome";
import { Editor } from "@/components/tiptap-editor";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { extensions } from "@/features/posts/editor/config";
import { CodeBlockHighlightProvider } from "@/features/posts/editor/extensions/code-block/code-block-highlight-context";
import { postRevisionListQuery } from "@/features/posts/queries";
import { normalizePostContent } from "@/features/posts/utils/normalize-content";
import { m } from "@/paraglide/messages";
import { useAutoSave, usePostActions } from "./hooks";
import { PostEditorHeader } from "./post-editor-header";
import { PostEditorMetadata } from "./post-editor-metadata";
import { PostEditorInfoPanel } from "./post-editor-info-panel";
import { PostEditorSummary } from "./post-editor-summary";
import type { PostEditorData, PostEditorProps } from "./types";

export function PostEditor({ initialData, onSave }: PostEditorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPrimaryAction, setMobileTitle } = useAdminChrome();
  const [infoOpen, setInfoOpen] = useState(false);
  const closeInfo = useCallback(() => setInfoOpen(false), []);
  const [post, setPost] = useState<PostEditorData>(() => ({
    title: initialData.title,
    summary: initialData.summary,
    slug: initialData.slug,
    contentJson: normalizePostContent(initialData.contentJson) ?? null,
    publishedAt: initialData.publishedAt,
    pinnedAt: initialData.pinnedAt,
    tagIds: initialData.tagIds,
    categoryId: initialData.categoryId,
    hasPublicSnapshot: initialData.hasPublicSnapshot,
    serverToday: initialData.serverToday,
    coverMediaId: initialData.coverMediaId,
    cover: initialData.cover,
  }));
  const [editorContent] = useState<JSONContent | null>(
    () => normalizePostContent(initialData.contentJson) ?? null,
  );
  const [contentEpoch, setContentEpoch] = useState(0);
  const [editorRenderKey] = useState(`editor:${initialData.id}`);

  const editorRef = useRef<TiptapEditor | null>(null);
  const editorContentRef = useRef(editorContent);
  editorContentRef.current = editorContent;

  const getContent = useCallback(() => {
    const editor = editorRef.current;
    if (editor && !editor.isDestroyed) {
      return editor.getJSON();
    }
    return editorContentRef.current;
  }, []);

  const { saveStatus, lastSaved, setError, flush } = useAutoSave({
    post,
    getContent,
    contentEpoch,
    onSave,
  });

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
  }, []);

  const handleEditorUpdate = useCallback(() => {
    setContentEpoch((epoch) => epoch + 1);
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

  const openHistory = useCallback(async () => {
    try {
      await flush();
    } catch {
      toast.error(m.editor_status_save_error());
      return;
    }
    const revisions = await queryClient.ensureQueryData(
      postRevisionListQuery(initialData.id),
    );
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    if (desktop && revisions[0]) {
      await navigate({
        to: "/admin/posts/edit/$id/history/$revisionId",
        params: {
          id: String(initialData.id),
          revisionId: String(revisions[0].id),
        },
      });
      return;
    }
    await navigate({
      to: "/admin/posts/edit/$id/history",
      params: { id: String(initialData.id) },
    });
  }, [flush, initialData.id, navigate, queryClient]);

  const publishRef = useRef(handlePublish);
  publishRef.current = handlePublish;

  useEffect(() => {
    if (infoOpen) {
      setMobileTitle(m.editor_info_title());
      setPrimaryAction({
        label: m.editor_info_done(),
        onClick: () => setInfoOpen(false),
      });
    } else {
      setMobileTitle(post.title.trim() || m.common_untitled());
      setPrimaryAction({
        label:
          processState === "PROCESSING"
            ? m.editor_header_processing()
            : m.editor_header_publish(),
        onClick: () => {
          void publishRef.current();
        },
        disabled: processState !== "IDLE" || !canPublish,
      });
    }
  }, [
    canPublish,
    infoOpen,
    post.title,
    processState,
    setMobileTitle,
    setPrimaryAction,
  ]);

  useEffect(() => {
    return () => {
      setMobileTitle(null);
      setPrimaryAction(null);
    };
  }, [setMobileTitle, setPrimaryAction]);

  const metadata = (
    <PostEditorMetadata
      post={post}
      isGeneratingSlug={isGeneratingSlug}
      onPostChange={handlePostChange}
      onGenerateSlug={handleGenerateSlug}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <ConfirmationModal
        isOpen={status === "blocked"}
        onClose={() => reset?.()}
        onConfirm={() => proceed?.()}
        title={m.editor_leave_title()}
        message={m.editor_leave_message()}
        confirmLabel={m.editor_leave_confirm()}
      />

      <section className="post-editor-workspace fuwari-card-base">
        <PostEditorHeader
          saveStatus={saveStatus}
          lastSaved={lastSaved}
          processState={processState}
          canPublish={canPublish}
          hasPublicSnapshot={post.hasPublicSnapshot}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          infoOpen={infoOpen}
          onOpenInfo={() => setInfoOpen((value) => !value)}
          onOpenHistory={() => void openHistory()}
        />
        <div className="post-editor-body">
          <CodeBlockHighlightProvider
            snapshotContent={initialData.publicSnapshotContentJson}
          >
            <Editor
              key={editorRenderKey}
              className="post-editor-surface"
              toolbarClassName="post-editor-toolbar"
              documentClassName="post-editor-document custom-scrollbar"
              scrollContainerId="post-editor-scroll-container"
              contentClassName="min-h-50"
              documentHeader={
                <>
                  <TextareaTitle
                    value={post.title}
                    onChange={(title) => handlePostChange({ title })}
                  />
                  <PostEditorSummary
                    categoryId={post.categoryId}
                    tagIds={post.tagIds}
                    hasCover={Boolean(post.cover)}
                    onOpenInfo={() => setInfoOpen(true)}
                  />
                </>
              }
              extensions={extensions}
              content={editorContent ?? ""}
              onUpdate={handleEditorUpdate}
              onCreated={handleEditorCreated}
            />
          </CodeBlockHighlightProvider>
        </div>
        <PostEditorInfoPanel open={infoOpen} onClose={closeInfo}>
          {metadata}
        </PostEditorInfoPanel>
      </section>
    </div>
  );
}

function TextareaTitle({
  value,
  onChange,
}: {
  value: string;
  onChange: (title: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      placeholder={m.editor_title_placeholder()}
      aria-label={m.editor_title_placeholder()}
      className="post-editor-title w-full resize-none overflow-hidden bg-transparent fuwari-text-90 outline-none placeholder:fuwari-text-30"
      onInput={(event) => {
        const el = event.currentTarget;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }}
      ref={(el) => {
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }}
    />
  );
}
