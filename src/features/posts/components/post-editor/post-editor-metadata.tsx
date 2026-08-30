import { Loader2, Pin, PinOff, RefreshCw } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { TagSelector } from "@/features/tags/components/tag-selector";
import { toLocalDateString } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { PostEditorCover } from "./post-editor-cover";
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
    <>
      <div className="mb-12">
        <TextareaAutosize
          value={post.title}
          onChange={(e) => onPostChange({ title: e.target.value })}
          minRows={1}
          placeholder={m.editor_title_placeholder()}
          className="w-full resize-none overflow-hidden border-none bg-transparent p-0 text-4xl font-medium leading-[1.2] tracking-tight text-foreground transition-all placeholder:text-muted-foreground/20 focus:outline-none md:text-6xl font-serif"
        />
      </div>

      <div className="mb-16 grid grid-cols-1 gap-x-12 gap-y-8 border-t border-border/30 pt-8 md:grid-cols-3">
        <div className="space-y-3">
          <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            {m.editor_meta_pin()}
          </label>
          <div>
            <button
              onClick={() =>
                onPostChange({
                  pinnedAt: post.pinnedAt ? null : new Date(),
                })
              }
              className={`
                  flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider transition-colors
                  ${
                    post.pinnedAt
                      ? "border-b border-foreground font-bold text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }
                `}
            >
              {post.pinnedAt ? <Pin size={12} /> : <PinOff size={12} />}
              {post.pinnedAt
                ? m.editor_meta_pinned()
                : m.editor_meta_unpinned()}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            {m.editor_meta_published_at()}
          </label>
          <div className="text-xs font-mono">
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
              className="h-auto! border-none! bg-transparent! p-0! text-xs text-foreground font-mono"
            />
          </div>
        </div>

        <div className="col-span-1 space-y-3 md:col-span-3">
          <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            {m.editor_meta_slug()}
          </label>
          <div className="group flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">
              /post/
            </span>
            <Input
              type="text"
              value={post.slug || ""}
              onChange={(e) => onPostChange({ slug: e.target.value })}
              className="h-auto flex-1 border-none bg-transparent p-0 px-0 text-xs font-mono text-foreground shadow-none placeholder:text-muted-foreground/30 focus-visible:ring-0"
              placeholder="your-post-slug"
            />
            <button
              onClick={onGenerateSlug}
              disabled={isGeneratingSlug}
              className="ml-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
            >
              {isGeneratingSlug ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <RefreshCw size={10} />
              )}
            </button>
          </div>
        </div>

        <div className="col-span-1 space-y-3 md:col-span-3">
          <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            {m.editor_meta_tags()}
          </label>
          <TagSelector
            value={post.tagIds}
            onChange={(tagIds) => onPostChange({ tagIds })}
          />
        </div>

        <div className="col-span-1 space-y-3 md:col-span-3">
          <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            {m.editor_meta_summary()}
          </label>
          <TextareaAutosize
            value={post.summary || ""}
            onChange={(e) => onPostChange({ summary: e.target.value })}
            placeholder={m.editor_summary_placeholder()}
            className="w-full resize-none bg-transparent text-xs font-mono leading-relaxed text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
          />
        </div>

        <PostEditorCover
          cover={post.cover}
          onChange={(next) => onPostChange(next)}
        />
      </div>
    </>
  );
}
