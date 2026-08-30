import { ClientOnly } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import type React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
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
  useEffect(() => {
    if (!isOpen || isLoading) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isLoading, onClose]);

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-100 flex items-center justify-center p-4 transition-opacity duration-200",
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none",
      )}
    >
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
        onClick={isLoading ? undefined : () => onClose()}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        className={cn(
          "relative w-full max-w-[420px] fuwari-card-base p-6 transition-all duration-200",
          isOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
      >
        <h2
          id="confirmation-modal-title"
          className="text-lg font-medium fuwari-text-90"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed fuwari-text-75">{message}</p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onClose()}
            disabled={isLoading}
            className="fuwari-btn-regular rounded-xl h-10 px-4 text-sm font-medium disabled:opacity-50"
          >
            {m.common_cancel()}
          </button>
          <button
            type="button"
            onClick={() => onConfirm()}
            disabled={isLoading}
            className={cn(
              "rounded-xl h-10 px-4 text-sm font-medium gap-2",
              isDanger ? "fuwari-btn-danger" : "fuwari-btn-primary",
            )}
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
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
