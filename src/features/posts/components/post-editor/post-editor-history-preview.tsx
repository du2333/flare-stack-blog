import { ArrowLeft, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { Editor } from "@/components/tiptap-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { extensions } from "@/features/posts/editor/config";
import { cn, formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  getRevisionReasonColorClass,
  getRevisionReasonIcon,
  getRevisionReasonLabel,
  type RevisionDetail,
} from "./post-editor-history.shared";

interface PostEditorHistoryPreviewProps {
  revision: RevisionDetail | null;
  tagNames: Array<string>;
  isLoading: boolean;
  isRestoring: boolean;
  isDeleting: boolean;
  onRestore: () => void;
  onDelete: () => void;
  onBack?: () => void;
}

export function PostEditorHistoryPreview({
  revision,
  tagNames,
  isLoading,
  isRestoring,
  isDeleting,
  onRestore,
  onDelete,
  onBack,
}: PostEditorHistoryPreviewProps) {
  return (
    <div className="custom-scrollbar min-h-0 overflow-y-auto">
      {isLoading ? (
        <div className="flex h-full items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          {m.editor_history_loading()}
        </div>
      ) : revision ? (
        <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col p-6 md:p-8">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-6 w-fit text-muted-foreground lg:hidden"
              onClick={onBack}
            >
              <ArrowLeft size={16} className="mr-2" />
              {m.common_back()}
            </Button>
          )}

          <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-border/30 pb-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {(() => {
                  const ReasonIcon = getRevisionReasonIcon(revision.reason);
                  return (
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1.5 px-2 py-0.5 text-xs rounded-sm",
                        getRevisionReasonColorClass(revision.reason),
                      )}
                    >
                      <ReasonIcon size={14} />
                      {getRevisionReasonLabel(revision.reason)}
                    </Badge>
                  );
                })()}
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

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onDelete}
                disabled={isDeleting || isRestoring}
                className="rounded-none text-destructive hover:text-destructive"
              >
                {isDeleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                <span className="ml-2">{m.editor_history_delete_action()}</span>
              </Button>

              <Button
                onClick={onRestore}
                disabled={isRestoring || isDeleting}
                className="rounded-none"
              >
                {isRestoring ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RotateCcw size={14} />
                )}
                <span className="ml-2">
                  {m.editor_history_restore_action()}
                </span>
              </Button>
            </div>
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
