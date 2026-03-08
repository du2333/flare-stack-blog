import { Loader2 } from "lucide-react";
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
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex h-8 select-none items-center justify-between border-t border-border/40 bg-background/80 px-6 text-[10px] font-mono backdrop-blur-md">
      <div className="flex items-center gap-6 text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>字符</span>
          <span className="text-foreground">{chars}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>词数</span>
          <span className="text-foreground">{words}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {saveStatus === "ERROR" ? (
          <span className="flex items-center gap-2 font-medium text-red-500">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            保存失败
          </span>
        ) : saveStatus === "SAVING" ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            保存中...
          </span>
        ) : saveStatus === "PENDING" ? (
          <span className="flex items-center gap-2 text-amber-500/80">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            未保存
          </span>
        ) : (
          <span className="flex items-center gap-2 text-muted-foreground/60 transition-opacity duration-300">
            {lastSaved
              ? `已保存 ${lastSaved.toLocaleTimeString([], {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "已同步"}
          </span>
        )}
      </div>
    </div>
  );
}
