import { useQueryClient } from "@tanstack/react-query";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import type { JSONContent, Editor as TiptapEditor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAdminChrome } from "@/components/admin/admin-chrome";
import { Editor } from "@/components/tiptap-editor";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { extensions } from "@/features/posts/editor/config";
import { postRevisionListQuery } from "@/features/posts/queries";
import { normalizePostContent } from "@/features/posts/utils/normalize-content";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useAutoSave, usePostActions } from "./hooks";
import { PostEditorHeader } from "./post-editor-header";
import { PostEditorMetadata } from "./post-editor-metadata";
import type { PostEditorData, PostEditorProps } from "./types";

export function PostEditor({ initialData, onSave }: PostEditorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPrimaryAction, setMobileTitle } = useAdminChrome();
  const [infoOpen, setInfoOpen] = useState(false);
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
      onOpenHistory={() => void openHistory()}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <ConfirmationModal
        isOpen={status === "blocked"}
        onClose={() => reset?.()}
        onConfirm={() => proceed?.()}
        title={m.editor_leave_title()}
        message={m.editor_leave_message()}
        confirmLabel={m.editor_leave_confirm()}
      />

      <section
        className={cn(
          "fuwari-card-base flex min-h-0 flex-1 flex-col overflow-hidden",
          infoOpen && "hidden lg:flex",
        )}
      >
        <PostEditorHeader
          saveStatus={saveStatus}
          lastSaved={lastSaved}
          processState={processState}
          canPublish={canPublish}
          hasPublicSnapshot={post.hasPublicSnapshot}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          onOpenInfo={() => setInfoOpen(true)}
        />
        <div
          id="post-editor-scroll-container"
          className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-8 md:px-8"
        >
          <TextareaTitle
            value={post.title}
            onChange={(title) => handlePostChange({ title })}
          />
          <Editor
            key={editorRenderKey}
            className="min-h-0"
            contentClassName="min-h-50 text-base leading-7"
            extensions={extensions}
            content={editorContent ?? ""}
            onUpdate={handleEditorUpdate}
            onCreated={handleEditorCreated}
          />
        </div>
      </section>

      <aside
        className={cn(
          "fuwari-card-base flex min-h-0 flex-col overflow-hidden",
          infoOpen
            ? "flex flex-1"
            : "hidden lg:flex lg:w-72 lg:shrink-0 xl:w-80",
        )}
      >
        {metadata}
      </aside>
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
      className="mb-4 w-full resize-none overflow-hidden bg-transparent pt-2 font-serif text-2xl font-medium leading-snug fuwari-text-90 outline-none placeholder:fuwari-text-30 md:text-3xl"
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
