import { ClientOnly } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type React from "react";
import { useDelayUnmount } from "@/hooks/use-delay-unmount";

export type ModalType = "LINK" | "IMAGE" | null;

interface InsertModalProps {
  type: ModalType;
  initialUrl?: string;
  onClose: () => void;
  onSubmit: (url: string, attrs?: { width?: number; height?: number }) => void;
}

const InsertModalInternal: React.FC<InsertModalProps> = ({
  type,
  initialUrl = "",
  onClose,
  onSubmit,
}) => {
  const isMounted = !!type;
  const shouldRender = useDelayUnmount(isMounted, 500);
  const [activeType, setActiveType] = useState<ModalType>(type);
  const [inputUrl, setInputUrl] = useState(initialUrl);

  useEffect(() => {
    if (type) {
      setActiveType(type);
      setInputUrl(initialUrl);
    }
  }, [type, initialUrl]);

  const handleSubmit = () => {
    const trimmed = inputUrl.trim();
    if (activeType === "LINK") {
      // Allow empty submit to support "remove link" when editing an existing link.
      if (trimmed || initialUrl.trim()) onSubmit(trimmed);
      return;
    }

    if (trimmed) onSubmit(trimmed);
  };

  if (!shouldRender) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center p-4 md:p-6 transition-all duration-500 ease-in-out ${
        isMounted
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/90 backdrop-blur-md transition-opacity duration-500"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`
            relative w-full max-w-lg bg-background border border-border/20 shadow-2xl
            flex flex-col overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] transform
            ${
              isMounted
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-4 scale-[0.98] opacity-0"
            }
       `}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-border/10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-foreground tracking-widest uppercase">
              {activeType === "LINK" ? "[ 插入链接 ]" : "[ 插入图片 ]"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* URL Input */}
          <div className="space-y-3 group">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest group-focus-within:text-foreground transition-colors">
              {activeType === "IMAGE" ? "图片地址 (URL)" : "目标链接地址"}
            </label>
            <input
              type="url"
              autoFocus={activeType === "LINK"}
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="https://..."
              className="w-full bg-transparent border-0 border-b border-border/40 text-foreground font-mono text-sm py-2 focus:border-foreground focus:outline-none transition-all placeholder:text-muted-foreground/20 rounded-none shadow-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex items-center justify-end gap-6">
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              activeType === "LINK"
                ? !inputUrl.trim() && !initialUrl.trim()
                : !inputUrl.trim()
            }
            className="text-[10px] font-mono font-bold uppercase tracking-widest text-foreground hover:opacity-70 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {activeType === "LINK" && !inputUrl.trim() && initialUrl.trim()
              ? "[ 移除 ]"
              : "[ 确认 ]"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const InsertModal: React.FC<InsertModalProps> = (props) => {
  return (
    <ClientOnly>
      <InsertModalInternal {...props} />
    </ClientOnly>
  );
};

export default InsertModal;
