import { ClientOnly } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useRef } from "react";
import { FuwariModal } from "@/components/ui/fuwari-modal";
import { m } from "@/paraglide/messages";

export function TaxonomyNameDialog({
  open,
  title,
  name,
  onNameChange,
  onClose,
  onSave,
  onDelete,
  busy,
  description,
  submitLabel = m.category_manager_save(),
  maxLength,
  fallbackFocus,
}: {
  open: boolean;
  title: string;
  name: string;
  onNameChange: (name: string) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  busy: boolean;
  description?: string;
  submitLabel?: string;
  maxLength?: number;
  fallbackFocus?: () => HTMLElement | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <ClientOnly>
      <FuwariModal
        open={open}
        onClose={onClose}
        busy={busy}
        label={title}
        initialFocus={() => inputRef.current}
        fallbackFocus={fallbackFocus}
        className="taxonomy-name-dialog"
      >
        <header>
          <h2>{title}</h2>
          <button
            type="button"
            aria-label={m.common_close()}
            disabled={busy}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        {description ? <p>{description}</p> : null}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy && name.trim()) onSave();
          }}
        >
          <input
            ref={inputRef}
            aria-label={title}
            value={name}
            maxLength={maxLength}
            disabled={busy}
            onChange={(event) => onNameChange(event.target.value)}
            autoComplete="off"
          />
          <footer>
            {onDelete ? (
              <button
                type="button"
                className="taxonomy-delete"
                disabled={busy}
                onClick={onDelete}
              >
                {m.category_manager_delete()}
              </button>
            ) : null}
            <button
              type="button"
              className="fuwari-btn-regular"
              disabled={busy}
              onClick={onClose}
            >
              {m.category_manager_cancel()}
            </button>
            <button
              type="submit"
              className="fuwari-btn-primary"
              disabled={busy || !name.trim()}
            >
              {busy ? m.common_processing() : submitLabel}
            </button>
          </footer>
        </form>
      </FuwariModal>
    </ClientOnly>
  );
}
