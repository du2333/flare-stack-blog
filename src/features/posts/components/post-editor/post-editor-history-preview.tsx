import { Loader2, RotateCcw } from "lucide-react";
import { Editor } from "@/components/tiptap-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { extensions } from "@/features/posts/editor/config";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  getRevisionReasonLabel,
  getRevisionReasonVariant,
  type RevisionDetail,
} from "./post-editor-history.shared";

interface PostEditorHistoryPreviewProps {
  revision: RevisionDetail | null;
  tagNames: Array<string>;
  isLoading: boolean;
  isRestoring: boolean;
  onRestore: () => void;
}

export function PostEditorHistoryPreview({
  revision,
  tagNames,
  isLoading,
  isRestoring,
  onRestore,
}: PostEditorHistoryPreviewProps) {
  return (
    <div className="custom-scrollbar min-h-0 overflow-y-auto">
      {isLoading ? (
        <div className="flex h-full items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          {m.editor_history_loading()}
        </div>
      ) : revision ? (
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col p-6 md:p-8">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-border/30 pb-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={getRevisionReasonVariant(revision.reason)}>
                  {getRevisionReasonLabel(revision.reason)}
                </Badge>
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/55">
                  {formatDate(revision.createdAt, {
                    includeTime: true,
                  })}
                </span>
              </div>

              <h3 className="text-3xl font-serif leading-tight text-foreground">
                {revision.snapshotJson.title.trim() || m.common_untitled()}
              </h3>

              <p className="max-w-2xl text-sm leading-6 text-muted-foreground/80">
                {revision.snapshotJson.summary?.trim() ||
                  m.editor_history_no_summary()}
              </p>
            </div>

            <Button
              onClick={onRestore}
              disabled={isRestoring}
              className="rounded-none"
            >
              {isRestoring ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RotateCcw size={14} />
              )}
              <span className="ml-2">{m.editor_history_restore_action()}</span>
            </Button>
          </div>

          <div className="mb-8 grid gap-6 border-b border-border/20 pb-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/60">
                {m.editor_history_slug_label()}
              </p>
              <p className="text-sm text-foreground">
                /post/{revision.snapshotJson.slug}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/60">
                {m.editor_history_tags_label()}
              </p>
              <div className="flex flex-wrap gap-2">
                {tagNames.length > 0 ? (
                  tagNames.map((tagName) => (
                    <Badge key={tagName} variant="secondary">
                      {tagName}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground/70">
                    {m.editor_history_no_tags()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1">
            <Editor
              key={revision.id}
              extensions={extensions}
              content={revision.snapshotJson.contentJson ?? ""}
              editable={false}
              className="min-h-full"
              contentClassName="min-h-0 text-base leading-7"
            />
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground/70">
          {m.editor_history_preview_empty()}
        </div>
      )}
    </div>
  );
}
