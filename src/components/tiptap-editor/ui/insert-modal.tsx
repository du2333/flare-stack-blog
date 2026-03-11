import { ClientOnly } from "@tanstack/react-router";
import {
  Check,
  Globe,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Search,
  X,
} from "lucide-react";
import type React from "react";
import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMediaPicker } from "@/features/media/components/media-library/hooks";
import type { MediaAsset } from "@/features/media/components/media-library/types";
import { getOptimizedImageUrl } from "@/features/media/utils/media.utils";
import { useDelayUnmount } from "@/hooks/use-delay-unmount";
import { m } from "@/paraglide/messages";

export type ModalType = "LINK" | "IMAGE" | null;

interface InsertModalProps {
  type: ModalType;
  initialUrl?: string;
  onClose: () => void;
  onSubmit: (url: string, attrs?: { width?: number; height?: number }) => void;
}

const MediaItem = memo(
  ({
    media,
    isSelected,
    onSelect,
  }: {
    media: MediaAsset;
    isSelected: boolean;
    onSelect: (m: MediaAsset) => void;
  }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
      <div
        onClick={() => onSelect(media)}
        className={`
                relative aspect-square border cursor-pointer transition-all duration-500 bg-muted/30 group overflow-hidden rounded-sm
                ${
                  isSelected
                    ? "border-primary opacity-100 shadow-lg"
                    : "border-border opacity-60 hover:opacity-100 hover:border-foreground"
                }
            `}
      >
        {!isLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
            <ImageIcon size={18} className="text-muted-foreground/30" />
          </div>
        )}

        <img
          src={getOptimizedImageUrl(media.key)}
          alt={media.fileName}
          className={`w-full h-full object-cover transition-all duration-1000 ${
            isLoaded ? "opacity-100" : "opacity-0"
          } ${isSelected ? "scale-105" : "group-hover:scale-110"}`}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
        />

        {isSelected && (
          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center backdrop-blur-[1px]">
            <div className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-xl animate-in zoom-in-50 duration-300">
              <Check size={14} strokeWidth={3} />
            </div>
          </div>
        )}
      </div>
    );
  },
);

MediaItem.displayName = "MediaItem";

const InsertModalInternal: React.FC<InsertModalProps> = ({
  type,
  initialUrl = "",
  onClose,
  onSubmit,
}) => {
  const isMounted = !!type;
  const shouldRender = useDelayUnmount(isMounted, 500);
  const [activeType, setActiveType] = useState<ModalType>(type);

  useEffect(() => {
    if (type) setActiveType(type);
  }, [type]);

  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset | null>(null);

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

  useEffect(() => {
    if (type) {
      setInputUrl(initialUrl);
      setSelectedMedia(null);
      setSearchQuery("");
    }
  }, [initialUrl, type, setSearchQuery]);

  const handleSubmit = () => {
    const trimmed = inputUrl.trim();
    if (activeType === "LINK") {
      // Allow empty submit to support "remove link" when editing an existing link.
      if (trimmed || initialUrl.trim()) onSubmit(trimmed);
      return;
    }

    if (trimmed) {
      if (selectedMedia && selectedMedia.url === trimmed) {
        onSubmit(trimmed, {
          width: selectedMedia.width || undefined,
          height: selectedMedia.height || undefined,
        });
      } else {
        onSubmit(trimmed);
      }
    }
  };

  if (!shouldRender) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center p-4 md:p-6 transition-all duration-300 ease-out ${
        isMounted
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content - Command Palette Style */}
      <div
        className={`
            relative w-full max-w-2xl bg-background border border-border shadow-2xl 
            flex flex-col overflow-hidden rounded-none max-h-[80vh] transition-all duration-300 ease-out transform
            ${
              isMounted
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-4 scale-[0.98] opacity-0"
            }
       `}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border/50 bg-muted/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 border border-border bg-background text-foreground">
              {activeType === "LINK" ? (
                <LinkIcon size={14} />
              ) : (
                <ImageIcon size={14} />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest font-mono text-muted-foreground leading-none mb-1">
                COMMAND
              </span>
              <span className="text-base font-bold font-mono tracking-wider text-foreground uppercase">
                {activeType === "LINK"
                  ? m.editor_insert_link_title()
                  : m.editor_insert_media_title()}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted/10"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden min-h-0 bg-background">
          {activeType === "IMAGE" && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Search Bar */}
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

              {/* Media Grid */}
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
                    <span className="text-sm font-mono">
                      {m.media_grid_empty()}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 content-start pb-4">
                    {mediaItems.map((media) => (
                      <MediaItem
                        key={media.key}
                        media={media}
                        isSelected={selectedMedia?.key === media.key}
                        onSelect={(asset) => {
                          setSelectedMedia(asset);
                          setInputUrl(asset.url);
                        }}
                      />
                    ))}
                    <div
                      ref={observerTarget}
                      className="col-span-full h-8 flex items-center justify-center p-4"
                    >
                      {isLoadingMore && (
                        <Loader2
                          size={14}
                          className="animate-spin text-muted-foreground"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* URL Input Area */}
          <div className="p-6 space-y-4 border-t border-border/50 bg-background">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={12} className="text-muted-foreground" />
              <label className="text-xs uppercase tracking-widest font-mono text-muted-foreground">
                {activeType === "IMAGE"
                  ? m.editor_insert_external_link()
                  : m.editor_insert_target_url()}
              </label>
            </div>
            <div className="group relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm pointer-events-none group-focus-within:text-foreground transition-colors"></span>
              <input
                type="text"
                autoFocus={activeType === "LINK"}
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  if (selectedMedia) setSelectedMedia(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="https://..."
                className="w-full bg-transparent border-b border-border text-foreground font-mono text-base py-2 pl-4 focus:border-foreground focus:outline-none transition-all placeholder:text-muted-foreground/20"
              />
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-0 border-t border-border/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-4 text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors border-r border-border/50"
          >
            [ {m.editor_insert_cancel()} ]
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              activeType === "LINK"
                ? !inputUrl.trim() && !initialUrl.trim()
                : !inputUrl.trim()
            }
            className="flex-1 px-6 py-4 text-xs font-mono font-bold uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground"
          >
            [{" "}
            {activeType === "LINK" && !inputUrl.trim() && initialUrl.trim()
              ? m.editor_insert_remove()
              : m.editor_insert_confirm()}{" "}
            ]
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const InsertModal: React.FC<InsertModalProps> = (props) => {
  return (
    <ClientOnly>
      <InsertModalInternal {...props} />
    </ClientOnly>
  );
};

export default InsertModal;
