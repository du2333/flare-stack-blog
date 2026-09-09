import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MOTION, useReducedMotion } from "@/hooks/use-motion";
import { cn } from "@/lib/utils";
import "./fuwari-modal.css";

export interface FuwariModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
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
      className={cn("fuwari-modal", className)}
      data-state={open ? "open" : "closing"}
      aria-label={label}
      aria-labelledby={labelledBy}
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
        {open ? children : retained.current}
      </div>
    </dialog>,
    document.body,
  );
}
