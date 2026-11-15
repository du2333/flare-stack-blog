import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MOTION, useReducedMotion } from "@/hooks/use-motion";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import "./fuwari-modal.css";

export interface FuwariModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /**
   * A heading with a close button. The dialog is then a column: the header
   * stays, and the children scroll in the height the modal is bounded to.
   */
  title?: string;
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  busy?: boolean;
  initialFocus?: () => HTMLElement | null;
  returnFocus?: () => HTMLElement | null;
  fallbackFocus?: () => HTMLElement | null;
}

/** Shared top-layer dialog, with reversible entry/exit and stable exit content. */
export function FuwariModal({
  open,
  onClose,
  children,
  className,
  title,
  label,
  labelledBy,
  describedBy,
  busy = false,
  initialFocus,
  returnFocus,
  fallbackFocus,
}: FuwariModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const reduced = useReducedMotion();
  const titleId = useId();
  const previous = useRef<HTMLElement | null>(null);
  const focus = useRef({ initialFocus, returnFocus, fallbackFocus });
  focus.current = { initialFocus, returnFocus, fallbackFocus };
  const retained = useRef(children);
  if (open) retained.current = children;

  useEffect(() => {
    const dialog = ref.current!;
    if (open) {
      if (!dialog.open) {
        previous.current = document.activeElement as HTMLElement | null;
        dialog.showModal();
        focus.current.initialFocus?.()?.focus();
      }
      return;
    }
    if (!dialog.open) return;
    const timer = window.setTimeout(
      () => {
        dialog.close();
        const target =
          focus.current.returnFocus?.() ??
          (previous.current?.isConnected
            ? previous.current
            : focus.current.fallbackFocus?.());
        if (target?.isConnected) target.focus();
      },
      reduced ? 0 : MOTION.modal,
    );
    return () => window.clearTimeout(timer);
  }, [open, reduced]);
  useEffect(() => {
    const dialog = ref.current;
    return () => dialog?.close();
  }, []);

  return createPortal(
    <dialog
      ref={ref}
      className={cn("fuwari-modal", title && "fuwari-modal-titled", className)}
      data-state={open ? "open" : "closing"}
      aria-label={label}
      aria-labelledby={title ? titleId : labelledBy}
      aria-describedby={describedBy}
      onKeyDown={(event) => {
        if (event.key === "Escape") event.stopPropagation();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (open && !busy) onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || !open || busy) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <div className="fuwari-modal-content" inert={!open}>
        {title ? (
          <>
            <div className="fuwari-modal-header">
              <h2 id={titleId} className="fuwari-modal-title fuwari-text-90">
                {title}
              </h2>
              <IconButton
                label={m.common_close()}
                size="md"
                disabled={busy}
                onClick={onClose}
              >
                <X size={16} />
              </IconButton>
            </div>
            <div className="fuwari-modal-body">
              {open ? children : retained.current}
            </div>
          </>
        ) : open ? (
          children
        ) : (
          retained.current
        )}
      </div>
    </dialog>,
    document.body,
  );
}
