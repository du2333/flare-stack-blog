import { Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { MediaPicker } from "@/features/media/components/media-library/components";
import { getOptimizedImageUrl } from "@/features/media/utils/media.utils";
import { orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import type { PostEditorData } from "./types";

type CoverValue = NonNullable<PostEditorData["cover"]>;

function toCover(media: {
  id: number;
  key: string;
  url: string;
  fileName: string;
  width: number | null;
  height: number | null;
}): CoverValue {
  return {
    id: media.id,
    key: media.key,
    url: media.url,
    fileName: media.fileName,
    width: media.width,
    height: media.height,
  };
}

export function PostEditorCover({
  cover,
  onChange,
}: {
  cover: CoverValue | null;
  onChange: (next: {
    coverMediaId: number | null;
    cover: CoverValue | null;
  }) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const media = await orpcClient.media.upload({ image: file });
      onChange({
        coverMediaId: media.id,
        cover: toCover(media),
      });
    } catch {
      toast.error(m.editor_image_upload_failed());
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="col-span-1 space-y-3 md:col-span-3">
      <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
        {m.editor_meta_cover()}
      </label>
      <div className="flex items-start gap-4">
        <div className="h-24 w-40 shrink-0 overflow-hidden border border-border/30 bg-muted/20">
          {cover ? (
            <img
              src={getOptimizedImageUrl(cover.key, 320)}
              alt={cover.fileName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
              <ImageIcon size={20} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="h-8 px-3 text-[10px] font-mono uppercase tracking-widest border border-border/30 text-muted-foreground hover:text-foreground hover:border-foreground/50"
          >
            {m.editor_meta_cover_pick()}
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-8 px-3 text-[10px] font-mono uppercase tracking-widest border border-border/30 text-muted-foreground hover:text-foreground hover:border-foreground/50 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <span className="inline-flex items-center gap-1">
                <Upload size={12} />
                {m.editor_meta_cover_upload()}
              </span>
            )}
          </button>
          {cover && (
            <button
              type="button"
              onClick={() => onChange({ coverMediaId: null, cover: null })}
              className="h-8 px-3 text-[10px] font-mono uppercase tracking-widest border border-border/30 text-muted-foreground hover:text-destructive hover:border-destructive/40"
            >
              {m.editor_meta_cover_clear()}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleUpload(file);
          }}
        />
      </div>
      <MediaPicker
        open={pickerOpen}
        title={m.editor_meta_cover_pick()}
        onClose={() => setPickerOpen(false)}
        onSelect={(media) => {
          onChange({
            coverMediaId: media.id,
            cover: toCover(media),
          });
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
