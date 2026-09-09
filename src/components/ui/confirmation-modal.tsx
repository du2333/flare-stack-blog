import { ClientOnly } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useId } from "react";
import { FuwariModal } from "./fuwari-modal";
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
  const {
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    isLoading = false,
    isDanger = false,
    confirmLabel = m.common_confirm(),
  } = props;
  const titleId = useId();
  const messageId = useId();
  return (
    <FuwariModal
      open={isOpen}
      onClose={onClose}
      busy={isLoading}
      className="fuwari-confirmation"
      labelledBy={titleId}
      describedBy={messageId}
      returnFocus={props.returnFocus}
      fallbackFocus={props.fallbackFocus}
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
    </FuwariModal>
  );
}

export default function ConfirmationModal(props: ConfirmationModalProps) {
  return (
    <ClientOnly>
      <ConfirmationModalInternal {...props} />
    </ClientOnly>
  );
}
