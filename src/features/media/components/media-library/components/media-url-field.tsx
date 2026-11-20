import { CornerDownLeft } from "lucide-react";
import type { Ref } from "react";
import { useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useMediaUrlImport } from "../hooks";
import type { MediaAsset } from "../types";

/**
 * Where an image link is pasted to import the image into the media library:
 * the one link field of every place that takes an image. `onImport` gets the
 * Media the link became; a link to an image already in `known` resolves to
 * that image without importing it again.
 */
export function MediaUrlField({
  known,
  onImport,
  inputRef,
  className,
}: {
  known: ReadonlyArray<MediaAsset>;
  onImport: (asset: MediaAsset) => void;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
}) {
  const [url, setUrl] = useState("");
  const { importUrl, importing } = useMediaUrlImport(known);

  const submit = async () => {
    if (importing) return;
    const asset = await importUrl(url);
    if (!asset) return;
    setUrl("");
    onImport(asset);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 [--fuwari-field-font-size:13px] [--fuwari-field-height:36px] [--fuwari-field-radius:8px]",
        className,
      )}
    >
      <Input
        ref={inputRef}
        type="text"
        inputMode="url"
        spellCheck={false}
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
          event.preventDefault();
          void submit();
        }}
        aria-label={m.editor_image_url()}
        placeholder={m.media_import_placeholder()}
        disabled={importing}
        className="flex-1"
      />
      <IconButton
        size="md"
        label={m.editor_image_import()}
        onClick={() => void submit()}
        disabled={importing || !url.trim()}
      >
        {importing ? <Spinner size={14} /> : <CornerDownLeft size={14} />}
      </IconButton>
    </div>
  );
}
