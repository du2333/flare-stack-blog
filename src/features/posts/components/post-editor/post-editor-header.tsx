import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";
import type { PostEditorData } from "./types";

interface PostEditorHeaderProps {
  post: PostEditorData;
  processState: "IDLE" | "PROCESSING" | "SUCCESS";
  canPublish: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  isInspecting?: boolean;
  canRestore?: boolean;
  isRestoring?: boolean;
  isDeleting?: boolean;
  onExitHistory?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
}

export function PostEditorHeader({
  post,
  processState,
  canPublish,
  onPublish,
  onUnpublish,
  isInspecting = false,
  canRestore = false,
  isRestoring = false,
  isDeleting = false,
  onExitHistory,
  onRestore,
  onDelete,
}: PostEditorHeaderProps) {
  const getPublishButtonColor = () => {
    if (processState === "SUCCESS") return "text-emerald-500";
    return "text-foreground hover:text-foreground/80";
  };

  const getPublishButtonText = () => {
    if (processState === "PROCESSING") return m.editor_header_processing();
    if (processState === "SUCCESS") return m.editor_header_success();
    return m.editor_header_publish();
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/30 bg-background px-6">
      <div className="min-w-0 flex-1 overflow-hidden">
        <Breadcrumbs />
      </div>

      {isInspecting ? (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="h-8 rounded-none px-2 text-[10px] font-mono"
            onClick={onExitHistory}
          >
            {m.editor_history_back()}
          </Button>
          <Button
            variant="ghost"
            className="h-8 rounded-none px-2 text-[10px] font-mono text-destructive hover:text-destructive"
            disabled={!canRestore || isDeleting || isRestoring}
            onClick={onDelete}
          >
            {isDeleting ? (
              <Loader2 size={12} className="mr-1 animate-spin" />
            ) : (
              <Trash2 size={12} className="mr-1" />
            )}
            {m.editor_history_delete_action()}
          </Button>
          <Button
            className="h-8 rounded-none px-3 text-[10px] font-mono"
            disabled={!canRestore || isRestoring || isDeleting}
            onClick={onRestore}
          >
            {isRestoring ? (
              <Loader2 size={12} className="mr-1 animate-spin" />
            ) : (
              <RotateCcw size={12} className="mr-1" />
            )}
            {m.editor_history_restore_this()}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            {post.hasPublicSnapshot && (
              <Button
                onClick={onUnpublish}
                disabled={processState !== "IDLE"}
                variant="ghost"
                className="h-8 rounded-none px-2 text-[10px] font-mono text-orange-500 transition-colors disabled:opacity-30 hover:bg-transparent hover:text-orange-400"
              >
                <span className="mr-2 opacity-50">[</span>
                {m.editor_header_unpublish()}
                <span className="ml-2 opacity-50">]</span>
              </Button>
            )}

            <Button
              onClick={onPublish}
              disabled={processState !== "IDLE" || !canPublish}
              variant="ghost"
              className={`
              h-8 rounded-none px-2 text-[10px] font-mono transition-colors disabled:opacity-30 hover:bg-transparent
              ${getPublishButtonColor()}
            `}
            >
              <span className="mr-2 opacity-50">[</span>
              {getPublishButtonText()}
              <span className="ml-2 opacity-50">]</span>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
