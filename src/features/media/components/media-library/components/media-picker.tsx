import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FuwariModal } from "@/components/ui/fuwari-modal";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/features/media/media.schema";
import { extractImageKey } from "@/features/media/utils/media.utils";
import { orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import { useMediaPicker, useMediaUpload } from "../hooks";
import type { MediaAsset } from "../types";
import { MediaGrid } from "./media-grid";

export function MediaPicker({
  open,
  title,
  onClose,
  onSelect,
  allowUrlImport = false,
  returnFocus,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
  allowUrlImport?: boolean;
  returnFocus?: () => HTMLElement | null;
}) {
  const { mediaItems, loadMore, hasMore, isLoadingMore, isPending } =
    useMediaPicker(open);
  const { uploadFiles, isUploading } = useMediaUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (open) setUrl("");
  }, [open]);

  const importUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const existingKey = extractImageKey(trimmed);
    const existing = existingKey
      ? mediaItems.find((item) => item.key === existingKey)
      : undefined;
    if (existing) {
      onSelect(existing);
      return;
    }
    setImporting(true);
    try {
      const media = await orpcClient.media.importFromUrl({ url: trimmed });
      onSelect({ ...media, postCount: 0, isCover: false });
    } catch {
      toast.error(m.media_import_fail());
    } finally {
      setImporting(false);
    }
  };

  return (
    <FuwariModal
      open={open}
      onClose={onClose}
      label={title}
      returnFocus={returnFocus}
      className="fuwari-modal-wide"
    >
      <div className="flex flex-col max-h-[80dvh] overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium fuwari-text-90">{title}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileRef.current?.click()}
              className="fuwari-btn-primary rounded-xl h-9 px-3 text-sm font-medium"
            >
              {m.media_upload()}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={m.common_close()}
              className="h-9 w-9 grid place-items-center rounded-lg fuwari-text-50 hover:text-(--fuwari-primary)"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0">
          {isPending ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-(--fuwari-btn-regular-bg) animate-pulse"
                />
              ))}
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="py-16 text-center text-sm fuwari-text-50">
              {m.media_empty()}
            </div>
          ) : (
            <MediaGrid
              media={mediaItems}
              onSelect={onSelect}
              onLoadMore={loadMore}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              showMeta={false}
            />
          )}
        </div>
        {allowUrlImport ? (
          <div className="px-5 pb-5 flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={m.editor_insert_image_url()}
              className="flex-1 h-10 rounded-xl border border-(--fuwari-input-border) bg-(--fuwari-input-bg) px-3 font-sans text-sm fuwari-text-90 shadow-none focus-visible:border-(--fuwari-primary) focus-visible:ring-0"
              onKeyDown={(event) => {
                if (event.key === "Enter") void importUrl();
              }}
            />
            <button
              type="button"
              disabled={importing || !url.trim()}
              onClick={() => void importUrl()}
              className="fuwari-btn-regular rounded-xl h-10 px-4 text-sm font-medium"
            >
              {m.editor_insert_import()}
            </button>
          </div>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []).filter(
              (file) => file.size <= MAX_FILE_SIZE,
            );
            if (files.length > 0) void uploadFiles(files);
            event.target.value = "";
          }}
        />
      </div>
    </FuwariModal>
  );
}
