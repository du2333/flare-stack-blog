import { ClientOnly } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FuwariModal } from "@/components/ui/fuwari-modal";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { StatusText } from "@/components/ui/status-text";
import { m } from "@/paraglide/messages";
import "./taxonomy-name-dialog.css";

export function TaxonomyNameDialog({
  open,
  title,
  name,
  onNameChange,
  onClose,
  onSave,
  busy,
  submitLabel = m.category_manager_save(),
  maxLength,
  error,
  fallbackFocus,
}: {
  open: boolean;
  title: string;
  name: string;
  onNameChange: (name: string) => void;
  onClose: () => void;
  onSave: () => void;
  busy: boolean;
  submitLabel?: string;
  maxLength?: number;
  /** Why the name cannot be saved, shown under the field. */
  error?: string | null;
  fallbackFocus?: () => HTMLElement | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
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
          <IconButton
            label={m.common_close()}
            disabled={busy}
            onClick={onClose}
          >
            <X size={18} />
          </IconButton>
        </header>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy && name.trim()) onSave();
          }}
        >
          <Input
            ref={inputRef}
            aria-label={title}
            value={name}
            maxLength={maxLength}
            disabled={busy}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => onNameChange(event.target.value)}
            autoComplete="off"
          />
          {error ? (
            <StatusText error id={errorId}>
              {error}
            </StatusText>
          ) : null}
          <footer>
            <Button disabled={busy} onClick={onClose}>
              {m.category_manager_cancel()}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={busy}
              disabled={!name.trim()}
            >
              {busy ? m.common_processing() : submitLabel}
            </Button>
          </footer>
        </form>
      </FuwariModal>
    </ClientOnly>
  );
}
