import { Loader2 } from "lucide-react";
import { Editor } from "@/components/tiptap-editor";
import { inspectExtensions } from "@/features/posts/editor/config";
import type { PostRevisionSnapshot } from "@/features/posts/schema/post-revisions.schema";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { toDateOrNull } from "./post-editor-history.shared";

interface PostEditorHistoryDocumentProps {
  snapshot: PostRevisionSnapshot | null;
  tagNames: Array<string>;
  isLoading: boolean;
  editorKey: string;
}

export function PostEditorHistoryDocument({
  snapshot,
  tagNames,
  isLoading,
  editorKey,
}: PostEditorHistoryDocumentProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" />
        {m.editor_history_loading()}
      </div>
    );
  }

  if (!snapshot) {
    return (
      <p className="py-16 text-sm text-muted-foreground">
        {m.editor_history_empty()}
      </p>
    );
  }

  const publishedAt = toDateOrNull(snapshot.publishedAt);
  const title = snapshot.title.trim() || m.common_untitled();
  const summary = snapshot.summary?.trim();

  return (
    <div>
      <h1 className="mb-12 font-serif text-4xl leading-[1.2] font-medium tracking-tight md:text-6xl">
        {title}
      </h1>
      <div className="mb-16 grid gap-8 border-t border-border/30 pt-8 text-xs font-mono md:grid-cols-3">
        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
            {m.editor_meta_published_at()}
          </p>
          <p>
            {publishedAt
              ? formatDate(publishedAt)
              : m.editor_history_unpublished()}
          </p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
            {m.editor_history_slug_label()}
          </p>
          <p>/post/{snapshot.slug}</p>
        </div>
        <div className="space-y-2 md:col-span-3">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
            {m.editor_history_tags_label()}
          </p>
          <p>
            {tagNames.length > 0
              ? tagNames.join(" · ")
              : m.editor_history_no_tags()}
          </p>
        </div>
        <div className="space-y-2 md:col-span-3">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
            {m.editor_meta_summary()}
          </p>
          <p className="leading-relaxed">
            {summary || m.editor_history_no_summary()}
          </p>
        </div>
      </div>
      <div className="min-h-[60vh] pb-32">
        <Editor
          key={editorKey}
          extensions={inspectExtensions}
          content={snapshot.contentJson ?? ""}
          editable={false}
        />
      </div>
    </div>
  );
}
