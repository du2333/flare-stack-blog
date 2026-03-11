import { Loader2 } from "lucide-react";
import { m } from "@/paraglide/messages";
import type { SaveStatus } from "./types";

interface PostEditorStatusBarProps {
  chars: number;
  words: number;
  saveStatus: SaveStatus;
  lastSaved: Date | null;
}

export function PostEditorStatusBar({
  chars,
  words,
  saveStatus,
  lastSaved,
}: PostEditorStatusBarProps) {
  const renderStatus = () => {
    switch (saveStatus) {
      case "ERROR":
        return (
          <span className="flex items-center gap-2 font-medium text-red-500">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            {m.editor_status_save_error()}
          </span>
        );
      case "SAVING":
        return (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            {m.editor_status_saving()}
          </span>
        );
      case "PENDING":
        return (
          <span className="flex items-center gap-2 text-amber-500/80">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {m.editor_status_unsaved()}
          </span>
        );
      case "SYNCED":
      default:
        return (
          <span className="flex items-center gap-2 text-muted-foreground/60 transition-opacity duration-300">
            {lastSaved
              ? m.editor_status_saved({
                  time: lastSaved.toLocaleTimeString([], {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })
              : m.editor_status_synced()}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex h-8 select-none items-center justify-between border-t border-border/40 bg-background/80 px-6 text-[10px] font-mono backdrop-blur-md">
      <div className="flex items-center gap-6 text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{m.editor_status_chars()}</span>
          <span className="text-foreground">{chars}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{m.editor_status_words()}</span>
          <span className="text-foreground">{words}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">{renderStatus()}</div>
    </div>
  );
}
