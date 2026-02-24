import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { Guitar, GripVertical } from "lucide-react";

/**
 * 编辑器内 Guitar Pro 节点的预览块
 */
export function GuitarProBlock({ node, selected }: NodeViewProps) {
  const { src, fileName } = node.attrs as {
    src: string;
    fileName: string;
  };

  const displayName = fileName || src?.split("/").pop() || "Guitar Pro 文件";

  return (
    <NodeViewWrapper className="my-4">
      <div
        className={`
          border bg-muted/5 flex items-center gap-3 p-4 transition-colors select-none
          ${selected ? "border-foreground/50 bg-muted/10" : "border-border/50 hover:border-border"}
        `}
        data-drag-handle
      >
        {/* 拖拽手柄 */}
        <div className="shrink-0 text-muted-foreground/40 cursor-grab active:cursor-grabbing">
          <GripVertical size={14} />
        </div>

        {/* 图标 */}
        <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-foreground/5">
          <Guitar size={18} className="text-muted-foreground" />
        </div>

        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-mono font-medium truncate">{displayName}</p>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5">
            Guitar Pro · 吉他谱嵌入
          </p>
        </div>

        {/* 标识 */}
        <div className="shrink-0 text-[9px] font-mono text-muted-foreground uppercase tracking-widest bg-muted/20 px-2 py-1">
          GP
        </div>
      </div>
    </NodeViewWrapper>
  );
}
