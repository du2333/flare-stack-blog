import { Loader2 } from "lucide-react";
import { Editor } from "@/components/tiptap-editor";
import { inspectExtensions } from "@/features/posts/editor/config";
import { normalizePostContent } from "@/features/posts/utils/normalize-content";
import type { PostRevisionSnapshot } from "@/features/posts/schema/post-revisions.schema";
import { m } from "@/paraglide/messages";

export function PostEditorHistoryDocument({
  snapshot,
  isLoading,
  editorKey,
}: {
  snapshot: PostRevisionSnapshot | null;
  isLoading: boolean;
  editorKey: string;
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
    <div>
      <h1 className="mb-4 font-serif text-2xl font-medium leading-snug fuwari-text-90 md:text-3xl">
        {title}
      </h1>
      <Editor
        key={editorKey}
        className="min-h-0"
        contentClassName="min-h-0 text-base leading-7"
        extensions={inspectExtensions}
        content={normalizePostContent(snapshot.contentJson) ?? ""}
        editable={false}
      />
    </div>
  );
}
