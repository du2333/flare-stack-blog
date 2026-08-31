import { ClientOnly } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MediaPicker } from "@/features/media/components/media-library/components";
import { useDelayUnmount } from "@/hooks/use-delay-unmount";
import { m } from "@/paraglide/messages";

export type ModalType = "LINK" | "IMAGE" | null;

interface InsertModalProps {
  type: ModalType;
  initialUrl?: string;
  onClose: () => void;
  onSubmit: (url: string, attrs?: { width?: number; height?: number }) => void;
}

function LinkModal({ type, initialUrl, onClose, onSubmit }: InsertModalProps) {
  const isMounted = type === "LINK";
  const shouldRender = useDelayUnmount(isMounted, 200);
  const [inputUrl, setInputUrl] = useState(initialUrl ?? "");

  useEffect(() => {
    if (type === "LINK") setInputUrl(initialUrl ?? "");
  }, [initialUrl, type]);

  if (!shouldRender) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md fuwari-card-base p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-medium fuwari-text-90">
            {m.editor_insert_link_title()}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-lg fuwari-text-50"
          >
            <X size={16} />
          </button>
        </div>
        <input
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
          className="mt-4 w-full h-11 rounded-xl border border-(--fuwari-input-border) bg-(--fuwari-input-bg) px-3 text-sm outline-none focus:border-(--fuwari-primary)"
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
    </div>,
    document.body,
  );
}

function InsertModalInternal(props: InsertModalProps) {
  if (props.type === "IMAGE") {
    return (
      <MediaPicker
        open
        title={m.editor_insert_media_title()}
        allowUrlImport
        onClose={props.onClose}
        onSelect={(media) => {
          props.onSubmit(media.url, {
            width: media.width || undefined,
            height: media.height || undefined,
          });
          props.onClose();
        }}
      />
    );
  }

  return <LinkModal {...props} />;
}

export default function InsertModal(props: InsertModalProps) {
  return (
    <ClientOnly>
      <InsertModalInternal {...props} />
    </ClientOnly>
  );
}
