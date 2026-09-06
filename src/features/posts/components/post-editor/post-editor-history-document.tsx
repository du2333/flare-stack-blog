import { Loader2 } from "lucide-react";
import { Editor } from "@/components/tiptap-editor";
import { inspectExtensions } from "@/features/posts/editor/config";
import { normalizePostContent } from "@/features/posts/utils/normalize-content";
import type { PostRevisionSnapshot } from "@/features/posts/schema/post-revisions.schema";
import { m } from "@/paraglide/messages";
import { PostEditorSummary } from "./post-editor-summary";

export function PostEditorHistoryDocument({
  snapshot,
  isLoading,
  editorKey,
  viewingTime,
}: {
  snapshot: PostRevisionSnapshot | null;
  isLoading: boolean;
  editorKey: string;
  viewingTime: string;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm fuwari-text-50">
        <Loader2 size={16} className="animate-spin" />
        {m.editor_history_loading()}
      </div>
    );
  }

  if (!snapshot) {
    return (
      <p className="py-16 text-sm fuwari-text-50">{m.editor_history_empty()}</p>
    );
  }

  const title = snapshot.title.trim() || m.common_untitled();

  return (
    <Editor
      key={editorKey}
      className="post-editor-surface"
      documentClassName="post-editor-document post-history-document custom-scrollbar"
      documentHeader={
        <>
          <h2 className="post-editor-title fuwari-text-90">{title}</h2>
          <p className="mb-4 text-xs fuwari-text-50">
            {m.editor_history_banner_title({ time: viewingTime })}
          </p>
          <PostEditorSummary
            categoryId={snapshot.categoryId}
            tagIds={snapshot.tagIds}
            hasCover={snapshot.coverMediaId !== null}
          />
        </>
      }
      contentClassName="min-h-0"
      extensions={inspectExtensions}
      content={normalizePostContent(snapshot.contentJson) ?? ""}
      editable={false}
    />
  );
}
