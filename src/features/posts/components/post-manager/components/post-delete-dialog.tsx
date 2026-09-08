import { useEffect, useId, useRef } from "react";
import { Loader2 } from "lucide-react";
import { m } from "@/paraglide/messages";

export function PostDeleteDialog({
  title,
  busy,
  onClose,
  onConfirm,
  returnFocus,
  fallbackFocus,
}: {
  title: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  returnFocus: HTMLElement | null;
  fallbackFocus: HTMLElement | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (returnFocus?.isConnected) returnFocus.focus();
      else if (fallbackFocus?.isConnected) fallbackFocus.focus();
    };
  }, [returnFocus, fallbackFocus]);
  return (
    <dialog
      ref={dialogRef}
      className="post-delete-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || busy) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      <h2 id={titleId}>{m.admin_posts_delete_confirm_title()}</h2>
      <p id={descriptionId}>{m.admin_posts_delete_confirm_desc({ title })}</p>
      <div className="post-delete-dialog-actions">
        <button
          type="button"
          className="fuwari-btn-regular"
          disabled={busy}
          onClick={onClose}
        >
          {m.common_cancel()}
        </button>
        <button
          type="button"
          className="fuwari-btn-danger"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          {busy ? m.common_processing() : m.admin_posts_delete_confirm_btn()}
        </button>
      </div>
    </dialog>
  );
}
