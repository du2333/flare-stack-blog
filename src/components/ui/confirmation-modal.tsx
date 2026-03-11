import { ClientOnly } from "@tanstack/react-router";
import { Loader2, X } from "lucide-react";
import type React from "react";
import { createPortal } from "react-dom";
import { m } from "@/paraglide/messages";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isDanger?: boolean;
  isLoading?: boolean;
}

const ConfirmationModalInternal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = m.common_confirm(),
  isDanger = false,
  isLoading = false,
}) => {
  return createPortal(
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center p-4 md:p-6 transition-all duration-300 ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/90 backdrop-blur-sm"
        onClick={isLoading ? undefined : () => onClose()}
      />

      {/* Modal Content */}
      <div
        className={`
          relative w-full max-w-md bg-background border border-border/30
          flex flex-col transform transition-all duration-300
          ${isOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
        `}
      >
        {/* Header */}
        <div className="px-6 pt-8 pb-4 flex items-start justify-between">
          <div className="space-y-2">
            <p
              className={`text-xs font-mono uppercase tracking-widest ${
                isDanger ? "text-destructive" : "text-muted-foreground/60"
              }`}
            >
              [
              {isDanger
                ? ` ${m.common_modal_state_danger()} `
                : ` ${m.common_modal_state_confirm()} `}
              ]
            </p>
            <h2 className="text-2xl font-serif font-medium text-foreground">
              {title}
            </h2>
          </div>
          <button
            onClick={() => onClose()}
            disabled={isLoading}
            className="p-2 -mr-2 text-muted-foreground/50 hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          <p className="text-base text-muted-foreground/80 leading-relaxed font-light">
            {message}
          </p>

          {isDanger && (
            <div className="mt-6 p-3 border-l-2 border-destructive/50 text-[11px] font-mono uppercase tracking-widest text-destructive/70">
              {m.common_irreversible()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button
            onClick={() => onClose()}
            disabled={isLoading}
            className="px-4 py-2.5 text-xs font-mono uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors disabled:opacity-50"
          >
            {m.common_cancel()}
          </button>
          <button
            onClick={() => onConfirm()}
            disabled={isLoading}
            className={`
              flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-mono uppercase tracking-widest transition-all
              ${
                isDanger
                  ? "bg-destructive text-destructive-foreground hover:opacity-80"
                  : "bg-foreground text-background hover:opacity-80"
              }
              disabled:opacity-40 disabled:cursor-not-allowed
            `}
          >
            {isLoading && <Loader2 size={12} className="animate-spin" />}
            <span>{isLoading ? m.common_processing() : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default function ConfirmationModal(props: ConfirmationModalProps) {
  return (
    <ClientOnly>
      <ConfirmationModalInternal {...props} />
    </ClientOnly>
  );
}
