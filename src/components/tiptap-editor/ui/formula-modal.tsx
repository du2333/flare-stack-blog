import { ClientOnly } from "@tanstack/react-router";
import katex from "katex";
import { X } from "lucide-react";
import type React from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { FuwariModal } from "@/components/ui/fuwari-modal";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

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
  returnFocus?: () => HTMLElement | null;
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
  returnFocus,
}) => {
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

  return (
    <FuwariModal
      open={isOpen}
      onClose={onClose}
      returnFocus={returnFocus}
      initialFocus={() => inputRef.current}
      label={editContext ? m.editor_formula_edit() : m.editor_formula_insert()}
      className="fuwari-modal-wide"
    >
      <div className="flex max-h-[85dvh] min-h-0 flex-col p-6">
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-medium fuwari-text-90">
              {editContext
                ? m.editor_formula_edit()
                : m.editor_formula_insert()}
            </h2>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveMode("inline")}
                className={cn(
                  "h-8 rounded-xl px-3 text-sm font-medium",
                  activeMode === "inline"
                    ? "fuwari-btn-primary"
                    : "fuwari-btn-regular",
                )}
              >
                {m.editor_formula_inline()}
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("block")}
                className={cn(
                  "h-8 rounded-xl px-3 text-sm font-medium",
                  activeMode === "block"
                    ? "fuwari-btn-primary"
                    : "fuwari-btn-regular",
                )}
              >
                {m.editor_formula_block()}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={m.common_close()}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg fuwari-text-50 hover:text-(--fuwari-primary)"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-auto md:flex-row md:gap-6">
          <div className="flex min-w-0 shrink-0 flex-col md:flex-1">
            <label className="mb-2 text-xs fuwari-text-50">LaTeX</label>
            <textarea
              ref={inputRef}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder={m.editor_formula_placeholder()}
              className="min-h-25 w-full resize-y rounded-xl border border-(--fuwari-input-border) bg-(--fuwari-input-bg) p-3 font-mono text-sm fuwari-text-90 outline-none placeholder:fuwari-text-30 focus:border-(--fuwari-primary) sm:min-h-30 sm:p-4"
              spellCheck={false}
            />
          </div>
          <div className="flex min-w-0 shrink-0 flex-col md:flex-1">
            <label className="mb-2 text-xs fuwari-text-50">
              {m.editor_formula_preview()}
            </label>
            <div
              className={cn(
                "flex min-h-20 items-center justify-center overflow-auto rounded-xl border border-(--fuwari-input-border) p-3 sm:min-h-30 sm:p-4",
                previewError
                  ? "bg-(--fuwari-danger-bg)"
                  : "bg-(--fuwari-input-bg)",
              )}
            >
              {previewError ? (
                <p className="text-center text-sm wrap-break-word text-(--fuwari-danger-fg)">
                  {previewError}
                </p>
              ) : previewHtml ? (
                <div
                  className="fuwari-custom-md katex-preview max-w-full overflow-x-auto [&_.katex]:text-inherit"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <p className="text-sm fuwari-text-30">
                  {m.editor_formula_preview_empty()}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex shrink-0 items-center justify-end gap-2">
          <span className="mr-auto hidden text-xs fuwari-text-50 sm:inline">
            {m.editor_formula_shortcut()}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="fuwari-btn-regular h-10 rounded-xl px-4 text-sm font-medium"
          >
            {m.editor_formula_cancel()}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!latex.trim()}
            className="fuwari-btn-primary h-10 rounded-xl px-4 text-sm font-medium"
          >
            {m.editor_formula_apply()}
          </button>
        </div>
      </div>
    </FuwariModal>
  );
};

export const FormulaModal: React.FC<FormulaModalProps> = memo((props) => (
  <ClientOnly>
    <FormulaModalInternal {...props} />
  </ClientOnly>
));
