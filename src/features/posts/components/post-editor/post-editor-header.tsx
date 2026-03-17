import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";
import type { PostEditorData } from "./types";

interface PostEditorHeaderProps {
  post: PostEditorData;
  saveStatus: "SYNCED" | "SAVING" | "PENDING" | "ERROR";
  processState: "IDLE" | "PROCESSING" | "SUCCESS";
  isPostDirty: boolean;
  onPreview: () => void;
  onProcess: () => void;
}

export function PostEditorHeader({
  post,
  saveStatus,
  processState,
  isPostDirty,
  onPreview,
  onProcess,
}: PostEditorHeaderProps) {
  const getProcessButtonColor = () => {
    if (processState === "SUCCESS") return "text-emerald-500";
    if (post.status === "draft" && post.hasPublicCache)
      return "text-orange-500";
    return "text-foreground hover:text-foreground/80";
  };

  const getProcessButtonText = () => {
    if (processState === "PROCESSING") return m.editor_header_processing();
    if (processState === "SUCCESS") return m.editor_header_success();
    if (post.status === "draft" && post.hasPublicCache)
      return m.editor_header_unpublish();
    return m.editor_header_publish();
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/30 bg-background px-6">
      <div className="min-w-0 flex-1 overflow-hidden">
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={onPreview}
            disabled={!post.hasPublicCache}
            title={
              !post.hasPublicCache
                ? m.editor_header_preview_unavailable()
                : m.editor_header_preview()
            }
            className="h-8 rounded-none px-2 text-[10px] font-mono text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground disabled:opacity-30"
          >
            <span className="mr-2 opacity-50">[</span>
            {m.editor_header_preview_btn()}
            <span className="ml-2 opacity-50">]</span>
          </Button>

          <div className="h-4 w-px bg-border/30" />

          <Button
            onClick={onProcess}
            disabled={
              processState !== "IDLE" ||
              saveStatus === "SAVING" ||
              !isPostDirty ||
              (post.status === "published" && !post.publishedAt)
            }
            variant="ghost"
            className={`
              h-8 rounded-none px-2 text-[10px] font-mono transition-colors disabled:opacity-30 hover:bg-transparent
              ${getProcessButtonColor()}
            `}
          >
            <span className="mr-2 opacity-50">[</span>
            {getProcessButtonText()}
            <span className="ml-2 opacity-50">]</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
