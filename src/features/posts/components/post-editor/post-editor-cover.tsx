import { Image as ImageIcon, Loader2, Search, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useMediaPicker } from "@/features/media/components/media-library/hooks";
import type { MediaAsset } from "@/features/media/components/media-library/types";
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
      {pickerOpen && (
        <CoverPickerModal
          onClose={() => setPickerOpen(false)}
          onSelect={(media) => {
            onChange({
              coverMediaId: media.id,
              cover: toCover(media),
            });
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function CoverPickerModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (media: MediaAsset) => void;
}) {
  const {
    mediaItems,
    searchQuery,
    setSearchQuery,
    loadMore,
    hasMore,
    isLoadingMore,
    isPending,
  } = useMediaPicker();
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 md:p-6">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-background border border-border shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
        <div className="flex justify-between items-center p-6 border-b border-border/50">
          <span className="text-base font-bold font-mono tracking-wider uppercase">
            {m.editor_meta_cover_pick()}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        <div className="relative shrink-0 border-b border-border/50">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={14}
          />
          <input
            type="text"
            placeholder={m.editor_insert_search_placeholder()}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-foreground text-sm font-mono pl-12 pr-6 py-4 focus:ring-0 placeholder:text-muted-foreground/40"
          />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-muted/5">
          {isPending ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="aspect-square bg-muted/20 animate-pulse border border-border/20"
                />
              ))}
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Search size={24} className="opacity-20" />
              <span className="text-sm font-mono">{m.media_grid_empty()}</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 content-start pb-4">
              {mediaItems.map((media) => (
                <button
                  key={media.key}
                  type="button"
                  onClick={() => onSelect(media)}
                  className="relative aspect-square border border-border cursor-pointer overflow-hidden hover:border-foreground"
                >
                  <img
                    src={getOptimizedImageUrl(media.key)}
                    alt={media.fileName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
              <div ref={observerTarget} className="col-span-full h-8" />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
