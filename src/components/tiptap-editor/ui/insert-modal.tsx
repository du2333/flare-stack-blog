import { ClientOnly } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FuwariModal } from "@/components/ui/fuwari-modal";
import { MediaPicker } from "@/features/media/components/media-library/components";
import { m } from "@/paraglide/messages";

export type ModalType = "LINK" | "IMAGE" | null;

interface InsertModalProps {
  type: ModalType;
  initialUrl?: string;
  returnFocus?: () => HTMLElement | null;
  onClose: () => void;
  onSubmit: (url: string, attrs?: { width?: number; height?: number }) => void;
}

function LinkModal({
  type,
  initialUrl,
  onClose,
  onSubmit,
  returnFocus,
}: InsertModalProps) {
  const isMounted = type === "LINK";
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputUrl, setInputUrl] = useState(initialUrl ?? "");

  useEffect(() => {
    if (type === "LINK") setInputUrl(initialUrl ?? "");
  }, [initialUrl, type]);

  return (
    <FuwariModal
      open={isMounted}
      onClose={onClose}
      label={m.editor_insert_link_title()}
      initialFocus={() => inputRef.current}
      returnFocus={returnFocus}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-medium fuwari-text-90">
            {m.editor_insert_link_title()}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={m.common_close()}
            className="h-8 w-8 grid place-items-center rounded-lg fuwari-text-50"
          >
            <X size={16} />
          </button>
        </div>
        <input
          ref={inputRef}
          aria-label={m.editor_insert_link_title()}
          autoFocus
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const trimmed = inputUrl.trim();
              if (trimmed || (initialUrl ?? "").trim()) onSubmit(trimmed);
            }
          }}
          placeholder="https://"
          className="mt-4 w-full h-11 rounded-xl border border-(--fuwari-input-border) bg-(--fuwari-input-bg) px-3 text-sm fuwari-text-90 outline-none focus:border-(--fuwari-primary)"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="fuwari-btn-regular rounded-xl h-10 px-4 text-sm font-medium"
          >
            {m.editor_insert_cancel()}
          </button>
          <button
            type="button"
            onClick={() => {
              const trimmed = inputUrl.trim();
              if (trimmed || (initialUrl ?? "").trim()) onSubmit(trimmed);
            }}
            className="fuwari-btn-primary rounded-xl h-10 px-4 text-sm font-medium"
          >
            {!inputUrl.trim() && (initialUrl ?? "").trim()
              ? m.editor_insert_remove()
              : m.editor_insert_confirm()}
          </button>
        </div>
      </div>
    </FuwariModal>
  );
}

function InsertModalInternal(props: InsertModalProps) {
  return (
    <>
      <LinkModal {...props} />
      <MediaPicker
        open={props.type === "IMAGE"}
        title={m.editor_insert_media_title()}
        allowUrlImport
        onClose={props.onClose}
        returnFocus={props.returnFocus}
        onSelect={(media) => {
          props.onSubmit(media.url, {
            width: media.width || undefined,
            height: media.height || undefined,
          });
          props.onClose();
        }}
      />
    </>
  );
}

export default function InsertModal(props: InsertModalProps) {
  return (
    <ClientOnly>
      <InsertModalInternal {...props} />
    </ClientOnly>
  );
}
