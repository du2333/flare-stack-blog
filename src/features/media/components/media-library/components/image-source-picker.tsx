import { CornerDownLeft, Upload } from "lucide-react";
import type { Ref } from "react";
import { useId, useRef, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Spinner } from "@/components/ui/spinner";
import { ACCEPTED_IMAGE_TYPES } from "@/features/media/media.schema";
import { m } from "@/paraglide/messages";
import type { useMediaPicker } from "../hooks";
import { useMediaUrlImport } from "../hooks";
import type { MediaAsset } from "../types";
import { MediaPickerGrid } from "./media-picker-grid";

const TABS = [
  { value: "upload", label: m.editor_image_tab_upload },
  { value: "link", label: m.editor_image_tab_link },
  { value: "library", label: m.editor_image_tab_library },
] as const;

export type ImageSourceTab = (typeof TABS)[number]["value"];

/**
 * The three ways to get an image: upload a file, import an image URL into
 * the media library, or pick one from the library. Where the image goes is
 * the caller's: `onFiles` gets chosen files to upload, `onSelect` an image
 * that is already Media, picked or imported.
 */
export function ImageSourcePicker({
  library,
  onFiles,
  uploading = false,
  multiple = false,
  onSelect,
  tab: controlledTab,
  onTabChange,
  tabsRef,
}: {
  library: ReturnType<typeof useMediaPicker>;
  onFiles: (files: Array<File>) => void;
  /** Disables choosing files while an upload is under way. */
  uploading?: boolean;
  /** Whether several files can be chosen at once. */
  multiple?: boolean;
  onSelect: (asset: MediaAsset) => void;
  /** The selected tab, for a caller that keeps it across openings. */
  tab?: ImageSourceTab;
  onTabChange?: (tab: ImageSourceTab) => void;
  /** The tab list, for focusing the selected tab when the picker opens. */
  tabsRef?: Ref<HTMLDivElement>;
}) {
  const [ownTab, setOwnTab] = useState<ImageSourceTab>("upload");
  const tab = controlledTab ?? ownTab;
  const setTab = onTabChange ?? setOwnTab;
  const id = useId();

  return (
    <>
      <SegmentedControl
        ref={tabsRef}
        role="tablist"
        idBase={id}
        track={false}
        value={tab}
        onValueChange={setTab}
        items={TABS.map((item) => ({ value: item.value, label: item.label() }))}
      />
      <div
        role="tabpanel"
        id={`${id}-${tab}-panel`}
        aria-labelledby={`${id}-${tab}-tab`}
      >
        {tab === "upload" ? (
          <UploadPanel
            onFiles={onFiles}
            uploading={uploading}
            multiple={multiple}
          />
        ) : tab === "link" ? (
          <LinkPanel known={library.mediaItems} onImport={onSelect} />
        ) : (
          <div className="max-h-72 overflow-y-auto p-1 custom-scrollbar">
            <MediaPickerGrid
              picker={library}
              onSelect={onSelect}
              columnsClassName="grid-cols-3"
            />
          </div>
        )}
      </div>
    </>
  );
}

function UploadPanel({
  onFiles,
  uploading,
  multiple,
}: {
  onFiles: (files: Array<File>) => void;
  uploading: boolean;
  multiple: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-(--fuwari-input-border) px-4 py-8 text-sm fuwari-text-50 transition-colors hover:border-(--fuwari-primary) hover:text-(--fuwari-primary) disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? <Spinner size={18} /> : <Upload size={18} />}
        {m.editor_image_upload_choose()}
      </button>
      <input
        ref={fileRef}
        type="file"
        multiple={multiple}
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) onFiles(files);
        }}
      />
    </>
  );
}

function LinkPanel({
  known,
  onImport,
}: {
  known: ReadonlyArray<MediaAsset>;
  onImport: (asset: MediaAsset) => void;
}) {
  const [url, setUrl] = useState("");
  const { importUrl, importing } = useMediaUrlImport(known);

  const submit = async () => {
    if (importing) return;
    const asset = await importUrl(url);
    if (asset) onImport(asset);
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        inputMode="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
          event.preventDefault();
          void submit();
        }}
        aria-label={m.editor_image_url()}
        placeholder="https://"
        disabled={importing}
        className="h-8 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-sm fuwari-text-90 outline-none placeholder:fuwari-text-30"
      />
      <IconButton
        label={m.editor_image_import()}
        onClick={() => void submit()}
        disabled={importing || !url.trim()}
      >
        {importing ? <Spinner size={14} /> : <CornerDownLeft size={14} />}
      </IconButton>
    </div>
  );
}
