import { useQueryClient } from "@tanstack/react-query";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import type { JSONContent, Editor as TiptapEditor } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import { CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { Editor } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { extensions } from "@/features/posts/editor/config";
import { CodeBlockHighlightProvider } from "@/features/posts/editor/extensions/code-block/code-block-highlight-context";
import { postContentOf } from "@/features/posts/editor/extensions/image-placeholder";
import { postRevisionListQuery } from "@/features/posts/queries";
import { normalizePostContent } from "@/features/posts/utils/normalize-content";
import {
  isValidPostSlug,
  POST_TITLE_MAX_LENGTH,
} from "@/features/posts/utils/post-fields";
import { withoutControlCharacters } from "@/lib/unicode-text";
import { m } from "@/paraglide/messages";
import { useDeletePost } from "../post-manager/hooks";
import { postStateOf } from "../post-state";
import { readPostListLocation } from "../post-manager/list-position";
import { useAutoSave, usePostActions } from "./hooks";
import { PostEditorHeader } from "./post-editor-header";
import { PostEditorMetadata } from "./post-editor-metadata";
import { PostEditorInfoPanel } from "./post-editor-info-panel";
import { PostEditorOutline, PostEditorStats } from "./post-editor-outline";
import { PostEditorSummary } from "./post-editor-summary";
import { SLUG_TAKEN_ERROR } from "./post-editor.model";
import type { PostEditorData, PostEditorProps } from "./types";

export function PostEditor({
  initialData,
  publicSlug,
  hasUnpublishedChanges,
  onSave,
  onReload,
}: PostEditorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [infoOpen, setInfoOpen] = useState(false);
  const closeInfo = useCallback(() => setInfoOpen(false), []);
  const [post, setPost] = useState<PostEditorData>(() => ({
    title: initialData.title,
    summary: initialData.summary,
    slug: initialData.slug,
    contentJson: normalizePostContent(initialData.contentJson) ?? null,
    publishedAt: initialData.publishedAt,
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
  // The same editor as state, for what is drawn from the document.
  const [liveEditor, setLiveEditor] = useState<TiptapEditor | null>(null);
  const editorContentRef = useRef(editorContent);
  editorContentRef.current = editorContent;

  const getContent = useCallback(() => {
    const editor = editorRef.current;
    if (editor && !editor.isDestroyed) {
      // Autosave and publish both save this.
      return postContentOf(editor.state.doc);
    }
    return editorContentRef.current;
  }, []);

  const {
    saveStatus,
    lastSaved,
    error: saveError,
    setError,
    flush,
    waitForInFlightSave,
    discardInFlightSave,
    conflict,
    getSaveToken,
    acceptSaveToken,
    reportConflict,
    overwrite,
  } = useAutoSave({
    post,
    getContent,
    contentEpoch,
    saveToken: initialData.saveToken,
    onSave,
  });

  // The route mounts a fresh editor once the latest post is read, which also
  // clears the conflict, so only a failed read needs handling here.
  const [reloading, setReloading] = useState(false);
  const reloadLatest = useCallback(async () => {
    discardInFlightSave();
    await onReload();
  }, [discardInFlightSave, onReload]);
  const handleLoadLatest = useCallback(async () => {
    setReloading(true);
    try {
      await reloadLatest();
    } catch {
      toast.error(m.editor_conflict_reload_failed());
      setReloading(false);
    }
  }, [reloadLatest]);

  // Edits not saved yet count as changes, so the state does not lag the typing.
  const state = postStateOf({
    published: post.hasPublicSnapshot,
    hasUnpublishedChanges: hasUnpublishedChanges || saveStatus !== "SYNCED",
  });

  // Unsaved edits of a deleted post have nowhere to go, so leave unguarded.
  const deletedRef = useRef(false);
  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => !deletedRef.current && saveStatus !== "SYNCED",
    withResolver: true,
  });

  const deleteMutation = useDeletePost({
    onSuccess: () => {
      deletedRef.current = true;
      void navigate({ to: "/admin/posts", search: readPostListLocation() });
    },
  });
  const [settlingSave, setSettlingSave] = useState(false);
  const handleDelete = useCallback(async () => {
    setSettlingSave(true);
    discardInFlightSave();
    await waitForInFlightSave();
    setSettlingSave(false);
    deleteMutation.mutate({ id: initialData.id, title: post.title });
  }, [
    deleteMutation,
    discardInFlightSave,
    initialData.id,
    post.title,
    waitForInFlightSave,
  ]);

  const {
    isGeneratingSlug,
    handleGenerateSlug,
    handlePublish,
    handleUnpublish,
    handleDiscard,
    processState,
    canPublish,
    lockSlug,
  } = usePostActions({
    postId: initialData.id,
    post,
    setPost,
    setError,
    flush,
    conflicted: conflict !== null,
    slugTaken: saveError === SLUG_TAKEN_ERROR,
    getSaveToken,
    acceptSaveToken,
    reportConflict,
    state,
    reload: reloadLatest,
  });

  const handleEditorCreated = useCallback((editor: TiptapEditor | null) => {
    editorRef.current = editor;
    setLiveEditor(editor);
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

  const metadata = (
    <PostEditorMetadata
      post={post}
      isGeneratingSlug={isGeneratingSlug}
      slugTaken={saveError === SLUG_TAKEN_ERROR}
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

      <section
        className="post-editor-workspace post-editor-page overflow-hidden"
        data-info-open={infoOpen || undefined}
      >
        <PostEditorHeader
          saveStatus={saveStatus}
          lastSaved={lastSaved}
          processState={processState}
          canPublish={canPublish}
          conflicted={conflict !== null}
          slugWithheld={
            !isValidPostSlug(post.slug) || saveError === SLUG_TAKEN_ERROR
          }
          hasPublicSnapshot={post.hasPublicSnapshot}
          hasUnpublishedChanges={state === "published-changed"}
          publicSlug={post.hasPublicSnapshot ? publicSlug : null}
          title={post.title}
          onPublish={handlePublish}
          onUnpublish={() => void handleUnpublish()}
          onDiscard={() => void handleDiscard()}
          onDelete={() => void handleDelete()}
          isDeleting={settlingSave || deleteMutation.isPending}
          infoOpen={infoOpen}
          onOpenInfo={() => setInfoOpen((value) => !value)}
          onOpenHistory={() => void openHistory()}
        />
        {conflict && (
          <Callout
            role="alert"
            tone="warning"
            icon={CircleAlert}
            className="post-editor-conflict"
            action={
              <>
                <Button
                  size="sm"
                  variant="primary"
                  loading={reloading}
                  onClick={() => void handleLoadLatest()}
                >
                  {m.editor_conflict_load_latest()}
                </Button>
                <Button
                  size="sm"
                  disabled={reloading || saveStatus === "SAVING"}
                  onClick={() => void overwrite()}
                >
                  {m.editor_conflict_overwrite()}
                </Button>
              </>
            }
          >
            <strong>{m.editor_conflict_title()}</strong>
            <p>{m.editor_conflict_desc()}</p>
          </Callout>
        )}
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
                  {post.cover ? (
                    <figure className="post-editor-banner">
                      <img src={post.cover.url} alt="" />
                      <Button
                        size="sm"
                        variant="overlay"
                        onClick={() => setInfoOpen(true)}
                      >
                        {m.editor_meta_cover_change()}
                      </Button>
                    </figure>
                  ) : null}
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
          <PostEditorOutline
            editor={liveEditor}
            epoch={contentEpoch}
            scrollContainerId="post-editor-scroll-container"
          />
          <PostEditorStats editor={liveEditor} epoch={contentEpoch} />
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
      // A title holds no line break or hidden character (the API refuses
      // them), so Enter and pasted ones do not stop it from saving.
      onChange={(e) =>
        onChange(withoutControlCharacters(e.target.value, { emoji: true }))
      }
      rows={1}
      maxLength={POST_TITLE_MAX_LENGTH}
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
