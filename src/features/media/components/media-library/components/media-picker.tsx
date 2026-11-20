import { X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FuwariModal } from "@/components/ui/fuwari-modal";
import { IconButton } from "@/components/ui/icon-button";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/features/media/media.schema";
import { m } from "@/paraglide/messages";
import { useMediaPicker, useMediaUpload } from "../hooks";
import type { MediaAsset } from "../types";
import { MediaPickerGrid } from "./media-picker-grid";
import { MediaUrlField } from "./media-url-field";

export function MediaPicker({
  open,
  title,
  onClose,
  onSelect,
  returnFocus,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
  returnFocus?: () => HTMLElement | null;
}) {
  const picker = useMediaPicker(open);
  const { uploadFiles, isUploading } = useMediaUpload();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <FuwariModal
      open={open}
      onClose={onClose}
      label={title}
      returnFocus={returnFocus}
      className="fuwari-modal-wide"
    >
      <div className="flex flex-col max-h-[80dvh] overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="mr-auto text-lg font-medium fuwari-text-90">
            {title}
          </h2>
          {/* An imported image is the one chosen; below the title when the
              row has no room for it. */}
          <MediaUrlField
            known={picker.mediaItems}
            onImport={onSelect}
            className="order-last w-full sm:order-none sm:w-72"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              disabled={isUploading}
              onClick={() => fileRef.current?.click()}
            >
              {m.media_upload()}
            </Button>
            <IconButton label={m.common_close()} size="md" onClick={onClose}>
              <X size={16} />
            </IconButton>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0">
          <MediaPickerGrid picker={picker} onSelect={onSelect} />
        </div>
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
