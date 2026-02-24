import { ClientOnly } from "@tanstack/react-router";
import { Sigma, SquareFunction, X } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import katex from "katex";
import type React from "react";
import { useDelayUnmount } from "@/hooks/use-delay-unmount";

export type FormulaMode = "inline" | "block";

export interface FormulaModalPayload {
  latex: string;
  pos: number;
  type: FormulaMode;
}

interface FormulaModalProps {
  isOpen: boolean;
  mode: FormulaMode;
  initialLatex: string;
  /** When editing existing node: { pos, type }. When inserting: null. */
  editContext: { pos: number; type: FormulaMode } | null;
  onClose: () => void;
  onApply: (
    latex: string,
    mode: FormulaMode,
    editContext: FormulaModalProps["editContext"],
  ) => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

const FormulaModalInternal: React.FC<FormulaModalProps> = ({
  isOpen,
  mode,
  initialLatex,
  editContext,
  onClose,
  onApply,
}) => {
  const shouldRender = useDelayUnmount(isOpen, 300);
  const [latex, setLatex] = useState(initialLatex);
  const [activeMode, setActiveMode] = useState<FormulaMode>(mode);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const debouncedLatex = useDebounce(latex, 200);

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!debouncedLatex.trim()) {
      setPreviewHtml(null);
      setPreviewError(null);
      return;
    }
    try {
      const html = katex.renderToString(debouncedLatex, {
        throwOnError: true,
        displayMode: activeMode === "block",
      });
      setPreviewHtml(html);
      setPreviewError(null);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : String(err));
      setPreviewHtml(null);
    }
  }, [debouncedLatex, activeMode]);

  useEffect(() => {
    if (isOpen) {
      setLatex(initialLatex);
      setActiveMode(mode);
      setPreviewError(null);
      setPreviewHtml(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen, initialLatex, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (latex.trim()) onApply(latex.trim(), activeMode, editContext);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, latex, activeMode, editContext, onClose, onApply]);

  const handleApply = useCallback(() => {
    const trimmed = latex.trim();
    if (trimmed) onApply(trimmed, activeMode, editContext);
  }, [latex, activeMode, editContext, onApply]);

  if (!shouldRender) return null;

  const Icon = activeMode === "inline" ? Sigma : SquareFunction;

  return createPortal(
    <div
      className={`fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 transition-all duration-300 ease-out ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full sm:max-w-2xl bg-background border border-border shadow-2xl flex flex-col overflow-hidden rounded-t-xl sm:rounded-none max-h-[90vh] sm:max-h-[85vh] transition-all duration-300 ease-out transform ${
          isOpen
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-[0.98] opacity-0"
        }`}
      >
        <div className="flex justify-between items-start sm:items-center gap-2 p-4 sm:p-6 border-b border-border/50 bg-muted/5 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 shrink-0 border border-border bg-background text-foreground">
                <Icon size={14} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground leading-none mb-0.5">
                  FORMULA
                </span>
                <span className="text-sm font-bold font-mono tracking-wider text-foreground uppercase truncate">
                  {editContext ? "编辑公式" : "插入公式"}
                </span>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setActiveMode("inline")}
                className={`px-2 py-1 text-[10px] font-mono uppercase transition-colors ${
                  activeMode === "inline"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                }`}
              >
                行内
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("block")}
                className={`px-2 py-1 text-[10px] font-mono uppercase transition-colors ${
                  activeMode === "block"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                }`}
              >
                块级
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 shrink-0 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted/10 -m-2"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0 p-4 sm:p-6 gap-4 md:gap-6 overflow-auto">
          <div className="flex flex-col min-w-0 shrink-0 md:flex-1">
            <label className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-2">
              LaTeX
            </label>
            <textarea
              ref={inputRef}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder="输入 LaTeX，如 x^2 + y^2 = z^2"
              className="w-full min-h-25 sm:min-h-30 p-3 sm:p-4 font-mono text-sm bg-transparent border border-border text-foreground focus:border-foreground focus:outline-none resize-y placeholder:text-muted-foreground/40"
              spellCheck={false}
            />
          </div>
          <div className="flex flex-col min-w-0 shrink-0 md:flex-1 md:border-l md:border-border/50 md:pl-6">
            <label className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-2">
              预览
            </label>
            <div
              className={`min-h-20 sm:min-h-30 p-3 sm:p-4 border border-border flex items-center justify-center overflow-auto ${
                previewError ? "bg-destructive/5" : "bg-muted/5"
              }`}
            >
              {previewError ? (
                <p className="text-xs font-mono text-destructive wrap-break-word text-center">
                  {previewError}
                </p>
              ) : previewHtml ? (
                <div
                  className="katex-preview [&_.katex]:text-inherit overflow-x-auto max-w-full"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <p className="text-xs font-mono text-muted-foreground/50">
                  输入 LaTeX 查看预览
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-0 border-t border-border/50 shrink-0">
          <span className="hidden sm:inline px-4 text-[10px] font-mono text-muted-foreground/60">
            Ctrl+Enter 应用 · Esc 取消
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 sm:px-6 py-3 sm:py-4 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors border-r border-border/50 active:bg-muted/20"
          >
            [ 取消 ]
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!latex.trim()}
            className="flex-1 px-4 sm:px-6 py-3 sm:py-4 text-[10px] font-mono font-bold uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground active:bg-foreground/90"
          >
            [ 应用 ]
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export const FormulaModal: React.FC<FormulaModalProps> = memo((props) => (
  <ClientOnly>
    <FormulaModalInternal {...props} />
  </ClientOnly>
));
