import { Loader2, RefreshCw } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import DatePicker from "@/components/ui/date-picker";
import { CategorySelect } from "@/features/categories/components/category-select";
import { TagSelector } from "@/features/tags/components/tag-selector";
import { cn, toLocalDateString } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { PostEditorCover } from "./post-editor-cover";
import { EDITOR_FIELD_CLASS } from "./post-editor-ui";
import type { PostEditorData } from "./types";

interface PostEditorMetadataProps {
  post: PostEditorData;
  isGeneratingSlug: boolean;
  onPostChange: (updates: Partial<PostEditorData>) => void;
  onGenerateSlug: () => void;
}

export function PostEditorMetadata({
  post,
  isGeneratingSlug,
  onPostChange,
  onGenerateSlug,
}: PostEditorMetadataProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 custom-scrollbar">
        <PostEditorCover
          cover={post.cover}
          onChange={(next) => onPostChange(next)}
        />

        <label className="grid gap-2 text-xs fuwari-text-50">
          {m.editor_meta_category()}
          <CategorySelect
            value={post.categoryId}
            onChange={(categoryId) => onPostChange({ categoryId })}
          />
        </label>

        <div className="grid gap-2">
          <p className="text-xs fuwari-text-50">{m.editor_meta_tags()}</p>
          <TagSelector
            value={post.tagIds}
            onChange={(tagIds) => onPostChange({ tagIds })}
          />
        </div>

        <label className="grid gap-2 text-xs fuwari-text-50">
          {m.editor_meta_link()}
          <div className="group flex items-center gap-1">
            <span className="shrink-0 pl-1 text-sm fuwari-text-50">/post/</span>
            <input
              type="text"
              value={post.slug || ""}
              onChange={(e) => onPostChange({ slug: e.target.value })}
              className={cn(EDITOR_FIELD_CLASS, "flex-1")}
              placeholder="your-post-slug"
            />
            <button
              type="button"
              onClick={onGenerateSlug}
              disabled={isGeneratingSlug}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl fuwari-text-50 hover:text-(--fuwari-primary) disabled:opacity-50"
              aria-label={m.editor_meta_auto_generate()}
            >
              {isGeneratingSlug ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
            </button>
          </div>
        </label>

        <div className="flex items-end gap-3">
          <label className="grid min-w-0 flex-1 gap-2 text-xs fuwari-text-50">
            {m.editor_meta_date()}
            <DatePicker
              value={
                post.publishedAt ? toLocalDateString(post.publishedAt) : ""
              }
              onChange={(dateStr) => {
                if (dateStr && dateStr > post.serverToday) return;
                onPostChange({
                  publishedAt: dateStr
                    ? new Date(`${dateStr}T12:00:00Z`)
                    : null,
                });
              }}
            />
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(post.pinnedAt)}
            onClick={() =>
              onPostChange({
                pinnedAt: post.pinnedAt ? null : new Date(),
              })
            }
            className="flex h-10 shrink-0 items-center gap-2 pb-0"
          >
            <span className="text-xs fuwari-text-50">
              {m.editor_meta_pin()}
            </span>
            <span
              className={cn(
                "relative h-6 w-10 rounded-full transition-colors",
                post.pinnedAt
                  ? "bg-(--fuwari-primary)"
                  : "bg-(--fuwari-btn-regular-bg)",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                  post.pinnedAt && "translate-x-4",
                )}
              />
            </span>
          </button>
        </div>

        <label className="grid gap-2 text-xs fuwari-text-50">
          {m.editor_meta_summary()}
          <TextareaAutosize
            value={post.summary || ""}
            onChange={(e) => onPostChange({ summary: e.target.value })}
            placeholder={m.editor_summary_placeholder()}
            minRows={3}
            className="w-full resize-none rounded-xl bg-(--fuwari-btn-regular-bg) px-3 py-2.5 text-sm leading-relaxed fuwari-text-90 outline-none placeholder:fuwari-text-30"
          />
        </label>
      </div>
    </div>
  );
}
