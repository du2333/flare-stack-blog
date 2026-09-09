import { ClientOnly } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import "./confirmation-modal.css";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isDanger?: boolean;
  isLoading?: boolean;
  returnFocus?: () => HTMLElement | null;
  fallbackFocus?: () => HTMLElement | null;
}

function ConfirmationModalInternal(props: ConfirmationModalProps) {
  const { isOpen, onClose, onConfirm, isLoading = false, returnFocus } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const focusRef = useRef({ returnFocus, fallbackFocus: props.fallbackFocus });
  focusRef.current = { returnFocus, fallbackFocus: props.fallbackFocus };
  const content = useRef(props);
  if (isOpen) content.current = props;
  const {
    title,
    message,
    confirmLabel = m.common_confirm(),
    isDanger = false,
  } = content.current;
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = dialogRef.current!;
    if (isOpen) {
      if (!dialog.open) {
        previousFocus.current = document.activeElement as HTMLElement | null;
        dialog.showModal();
      }
      return;
    }
    if (!dialog.open) return;
    // Keep the top layer and content alive until the exit animation completes.
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 0
      : 200;
    const timer = window.setTimeout(() => {
      dialog.close();
      const target =
        focusRef.current.returnFocus?.() ??
        (previousFocus.current?.isConnected
          ? previousFocus.current
          : focusRef.current.fallbackFocus?.());
      if (target?.isConnected) target.focus();
    }, duration);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => dialog?.close();
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="fuwari-confirmation"
      data-state={isOpen ? "open" : "closing"}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        event.preventDefault();
        if (isOpen && !isLoading) onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || !isOpen || isLoading)
          return;
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
      <h2 id={titleId}>{title}</h2>
      <p id={messageId}>{message}</p>
      <div className="fuwari-confirmation-actions">
        <button
          type="button"
          disabled={!isOpen || isLoading}
          onClick={onClose}
          className="fuwari-btn-regular"
        >
          {m.common_cancel()}
        </button>
        <button
          type="button"
          disabled={!isOpen || isLoading}
          onClick={onConfirm}
          className={cn(isDanger ? "fuwari-btn-danger" : "fuwari-btn-primary")}
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
          <span>{isLoading ? m.common_processing() : confirmLabel}</span>
        </button>
      </div>
    </dialog>,
    document.body,
  );
}

export default function ConfirmationModal(props: ConfirmationModalProps) {
  return (
    <ClientOnly>
      <ConfirmationModalInternal {...props} />
    </ClientOnly>
  );
}
