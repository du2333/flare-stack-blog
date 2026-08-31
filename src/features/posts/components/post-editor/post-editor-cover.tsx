import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { MediaPicker } from "@/features/media/components/media-library/components";
import { getOptimizedImageUrl } from "@/features/media/utils/media.utils";
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

  return (
    <div className="space-y-2">
      <p className="text-xs fuwari-text-50">{m.editor_meta_cover()}</p>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-(--fuwari-btn-regular-bg)">
        {cover ? (
          <img
            src={getOptimizedImageUrl(cover.key, 640)}
            alt={cover.fileName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center fuwari-text-30">
            <ImageIcon size={28} strokeWidth={1.5} />
          </div>
        )}
        <div className="absolute right-2 bottom-2 flex gap-1.5">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="h-8 rounded-xl bg-black/45 px-3 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/55"
          >
            {m.editor_meta_cover_change()}
          </button>
          {cover ? (
            <button
              type="button"
              onClick={() => onChange({ coverMediaId: null, cover: null })}
              className="h-8 rounded-xl bg-black/45 px-3 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/55"
            >
              {m.editor_meta_cover_clear()}
            </button>
          ) : null}
        </div>
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
