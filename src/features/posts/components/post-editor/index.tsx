import { useBlocker } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import TextareaAutosize from "react-textarea-autosize";
import { useAutoSave, usePostActions } from "./hooks";
import { EditorTableOfContents } from "./editor-table-of-contents";
import type { JSONContent, Editor as TiptapEditor } from "@tiptap/react";
import type { PostEditorData, PostEditorProps } from "./types";
import { TagSelector } from "@/features/tags/components/tag-selector";
import { tagsAdminQueryOptions } from "@/features/tags/queries";
import { Editor } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import DatePicker from "@/components/ui/date-picker";
import { toLocalDateString } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { POST_STATUSES } from "@/lib/db/schema";
import { extensions } from "@/features/posts/editor/config";
import { Breadcrumbs } from "@/components/breadcrumbs";

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

  return createPortal(
    <div className="fixed inset-0 z-80 flex flex-col bg-background overflow-hidden">
      <ConfirmationModal
        isOpen={status === "blocked"}
        onClose={() => reset?.()}
        onConfirm={() => proceed?.()}
        title="离开页面？"
        message="您有正在保存的更改。离开可能会导致部分数据丢失。"
        confirmLabel="确认离开"
      />

      {/* Control Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-border/30 bg-background z-40 sticky top-0">
        <div className="flex-1 min-w-0 overflow-hidden">
          <Breadcrumbs />
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => {
                if (post.slug) window.open(`/post/${post.slug}`, "_blank");
              }}
              disabled={!post.hasPublicCache}
              title={!post.hasPublicCache ? "前台暂无此文章" : "预览前台文章"}
              className="h-8 px-2 rounded-none text-[10px] font-mono hover:bg-transparent hover:text-foreground text-muted-foreground transition-colors disabled:opacity-30"
            >
              <span className="mr-2 opacity-50">[</span>
              预览
              <span className="ml-2 opacity-50">]</span>
            </Button>

            <div className="h-4 w-px bg-border/30" />

            <button
              onClick={handleProcessData}
              disabled={
                processState !== "IDLE" ||
                saveStatus === "SAVING" ||
                !isPostDirty ||
                (post.status === "published" && !post.publishedAt)
              }
              className={`
                    inline-flex items-center justify-center whitespace-nowrap
                    h-9 px-5 text-xs font-medium tracking-wide shrink-0 transition-all
                    disabled:pointer-events-none disabled:opacity-40
                    ${
                      processState === "SUCCESS"
                        ? "bg-emerald-600 text-white"
                        : post.status === "draft" && post.hasPublicCache
                          ? "bg-orange-500 text-white hover:bg-orange-600"
                          : "bg-foreground text-background hover:opacity-90"
                    }
                `}
            >
              {processState === "PROCESSING"
                ? "处理中..."
                : processState === "SUCCESS"
                  ? "✓ 已发布"
                  : post.status === "draft" && post.hasPublicCache
                    ? "下架"
                    : "发布"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Only this scrolls) */}
      <div
        id="post-editor-scroll-container"
        className="flex-1 overflow-y-auto custom-scrollbar relative scroll-smooth animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both delay-100"
      >
        <div className="w-full mx-auto py-20 px-6 md:px-12 grid grid-cols-1 xl:grid-cols-[1fr_240px] 2xl:grid-cols-[1fr_56rem_1fr] gap-12 items-start">
          <div className="hidden 2xl:block" />
          <div className="min-w-0 w-full max-w-4xl mx-auto 2xl:mx-0">
            {/* Title Area */}
            <div className="mb-12">
              <TextareaAutosize
                value={post.title}
                onChange={(e) =>
                  setPost((prev) => ({ ...prev, title: e.target.value }))
                }
                minRows={1}
                placeholder="在此输入文章标题..."
                className="w-full bg-transparent text-4xl md:text-6xl font-serif font-medium tracking-tight text-foreground placeholder:text-muted-foreground/20 focus:outline-none transition-all overflow-hidden leading-[1.2] resize-none border-none p-0"
              />
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-8 mb-16 border-t border-border/30 pt-8">
              {/* 1. Status */}
              <div className="space-y-3">
                <label className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
                  状态
                </label>
                <div className="flex items-center gap-4">
                  {POST_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => handlePostChange({ status: s })}
                      className={`
                                text-[10px] uppercase tracking-wider font-mono transition-colors
                                ${post.status === s ? "text-foreground font-bold border-b border-foreground" : "text-muted-foreground hover:text-foreground"}
                            `}
                    >
                      {s === "draft" ? "草稿" : "已发布"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Date */}
              <div className="space-y-3">
                <label className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
                  发布时间
                </label>
                <div className="font-mono text-xs">
                  <DatePicker
                    value={
                      post.publishedAt
                        ? toLocalDateString(post.publishedAt)
                        : ""
                    }
                    onChange={(dateStr) =>
                      handlePostChange({
                        publishedAt: dateStr
                          ? new Date(`${dateStr}T12:00:00Z`)
                          : null,
                      })
                    }
                    className="p-0! border-none! bg-transparent! text-xs text-foreground font-mono h-auto!"
                  />
                </div>
              </div>

              {/* 3. Read Time */}
              <div className="space-y-3">
                <label className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
                  阅读时长
                </label>
                <div className="flex items-center gap-2 group">
                  <Input
                    type="number"
                    value={post.readTimeInMinutes}
                    onChange={(e) =>
                      handlePostChange({
                        readTimeInMinutes: Number.parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-12 bg-transparent border-none shadow-none text-xs font-mono text-foreground focus-visible:ring-0 px-0 h-auto p-0"
                  />
                  <span className="text-[10px] font-mono text-muted-foreground">
                    分钟
                  </span>
                  <button
                    onClick={handleCalculateReadTime}
                    disabled={isCalculatingReadTime}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-muted-foreground hover:text-foreground"
                  >
                    {isCalculatingReadTime ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Sparkles size={10} />
                    )}
                  </button>
                </div>
              </div>

              {/* 4. Slug (Full Width) */}
              <div className="col-span-1 md:col-span-3 space-y-3">
                <label className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
                  链接 slug
                </label>
                <div className="flex items-center gap-2 group">
                  <span className="text-xs text-muted-foreground font-mono">
                    /post/
                  </span>
                  <Input
                    type="text"
                    value={post.slug || ""}
                    onChange={(e) => handlePostChange({ slug: e.target.value })}
                    className="flex-1 bg-transparent border-none shadow-none text-xs font-mono text-foreground focus-visible:ring-0 px-0 h-auto p-0 placeholder:text-muted-foreground/30"
                    placeholder="your-post-slug"
                  />
                  <button
                    onClick={handleGenerateSlug}
                    disabled={isGeneratingSlug}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-muted-foreground hover:text-foreground"
                  >
                    {isGeneratingSlug ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Sparkles size={10} />
                    )}
                  </button>
                </div>
              </div>

              {/* 5. Tags (Full Width) */}
              <div className="col-span-1 md:col-span-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
                    标签
                  </label>
                  <button
                    onClick={handleGenerateTags}
                    disabled={isGeneratingTags}
                    className="text-[9px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    {isGeneratingTags ? (
                      <Loader2 size={8} className="animate-spin" />
                    ) : (
                      <Sparkles size={8} />
                    )}
                    自动生成
                  </button>
                </div>
                <TagSelector
                  value={post.tagIds}
                  onChange={(tagIds) => handlePostChange({ tagIds })}
                />
              </div>

              {/* 6. Summary (Full Width) */}
              <div className="col-span-1 md:col-span-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
                    摘要
                  </label>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                    className="text-[9px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    {isGeneratingSummary ? (
                      <Loader2 size={8} className="animate-spin" />
                    ) : (
                      <Sparkles size={8} />
                    )}
                    自动生成
                  </button>
                </div>
                <TextareaAutosize
                  value={post.summary || ""}
                  onChange={(e) =>
                    handlePostChange({ summary: e.target.value })
                  }
                  placeholder="简短的介绍..."
                  className="w-full bg-transparent text-xs font-mono leading-relaxed text-foreground focus:outline-none resize-none placeholder:text-muted-foreground/30"
                />
              </div>
            </div>

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

      {/* Minimalist Status Bar */}
      <div className="fixed bottom-0 inset-x-0 h-8 bg-background/80 backdrop-blur-md border-t border-border/40 z-50 flex items-center justify-between px-6 text-[10px] font-mono select-none">
        <div className="flex items-center gap-6 text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>字符</span>
            <span className="text-foreground">{contentStats.chars}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>词数</span>
            <span className="text-foreground">{contentStats.words}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === "ERROR" ? (
            <span className="text-red-500 font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              保存失败
            </span>
          ) : saveStatus === "SAVING" ? (
            <span className="text-muted-foreground flex items-center gap-2">
              <Loader2 className="animate-spin w-2.5 h-2.5" />
              保存中...
            </span>
          ) : saveStatus === "PENDING" ? (
            <span className="text-amber-500/80 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              未保存
            </span>
          ) : (
            <span className="text-muted-foreground/60 flex items-center gap-2 transition-opacity duration-300">
              {lastSaved ? (
                <>
                  已保存{" "}
                  {lastSaved.toLocaleTimeString([], {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              ) : (
                "已同步"
              )}
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
