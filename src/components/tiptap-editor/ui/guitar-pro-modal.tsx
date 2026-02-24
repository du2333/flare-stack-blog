import { ClientOnly } from "@tanstack/react-router";
import {
  Check,
  Globe,
  Guitar,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MediaAsset } from "@/features/media/components/media-library/types";
import type React from "react";
import { useGuitarProPicker } from "./use-guitar-pro-picker";
import { useDelayUnmount } from "@/hooks/use-delay-unmount";

interface GuitarProModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (src: string, fileName: string) => void;
}

/**
 * Guitar Pro 文件列表项
 */
const GpFileItem = memo(
  ({
    media,
    isSelected,
    onSelect,
  }: {
    media: MediaAsset;
    isSelected: boolean;
    onSelect: (m: MediaAsset) => void;
  }) => (
    <div
      onClick={() => onSelect(media)}
      className={`
        relative flex items-center gap-3 px-4 py-3 border cursor-pointer transition-all duration-200 group
        ${
          isSelected
            ? "border-foreground/50 bg-foreground/5"
            : "border-border/40 hover:border-foreground/30 hover:bg-muted/10"
        }
      `}
    >
      {/* Icon */}
      <div
        className={`
          shrink-0 w-8 h-8 flex items-center justify-center transition-colors
          ${isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}
        `}
      >
        <Guitar size={16} />
      </div>

      {/* File name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono truncate">{media.fileName}</p>
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          {media.mimeType || "guitar-pro"}
        </p>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="shrink-0 bg-foreground text-background rounded-full p-1 animate-in zoom-in-50 duration-200">
          <Check size={10} strokeWidth={3} />
        </div>
      )}
    </div>
  ),
);
GpFileItem.displayName = "GpFileItem";

const GuitarProModalInternal: React.FC<GuitarProModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const shouldRender = useDelayUnmount(isOpen, 500);
  const [inputUrl, setInputUrl] = useState("");
  const [inputFileName, setInputFileName] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset | null>(null);

  const {
    gpItems,
    searchQuery,
    setSearchQuery,
    loadMore,
    hasMore,
    isLoadingMore,
    isPending,
  } = useGuitarProPicker();

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) loadMore();
      },
      { threshold: 0.1 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setInputUrl("");
      setInputFileName("");
      setSelectedMedia(null);
      setSearchQuery("");
    }
  }, [isOpen, setSearchQuery]);

  const handleSubmit = () => {
    const src = inputUrl.trim();
    if (!src) return;
    const name = inputFileName.trim() || selectedMedia?.fileName || src.split("/").pop() || "Guitar Pro";
    onSubmit(src, name);
  };

  if (!shouldRender) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center p-4 md:p-6 transition-all duration-300 ease-out ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`
          relative w-full max-w-2xl bg-background border border-border shadow-2xl
          flex flex-col overflow-hidden rounded-none max-h-[80vh] transition-all duration-300 ease-out transform
          ${
            isOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-4 scale-[0.98] opacity-0"
          }
        `}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border/50 bg-muted/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 border border-border bg-background text-foreground">
              <Guitar size={14} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground leading-none mb-1">
                COMMAND
              </span>
              <span className="text-sm font-bold font-mono tracking-wider text-foreground uppercase">
                插入吉他谱
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
          {/* Search Bar */}
          <div className="relative shrink-0 border-b border-border/50">
            <Search
              className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={14}
            />
            <input
              type="text"
              placeholder="搜索 Guitar Pro 文件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-foreground text-xs font-mono pl-12 pr-6 py-4 focus:ring-0 placeholder:text-muted-foreground/40"
            />
          </div>

          {/* GP File List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-muted/5 space-y-2">
            {isPending ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-14 bg-muted/20 animate-pulse border border-border/20"
                  />
                ))}
              </div>
            ) : gpItems.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Guitar size={24} className="opacity-20" />
                <span className="text-xs font-mono">NO_GP_FILES_FOUND</span>
                <span className="text-[10px] font-mono text-muted-foreground/60">
                  请先在媒体库中上传 Guitar Pro 文件
                </span>
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {gpItems.map((media) => (
                  <GpFileItem
                    key={media.key}
                    media={media}
                    isSelected={selectedMedia?.key === media.key}
                    onSelect={(m) => {
                      setSelectedMedia(m);
                      setInputUrl(m.url);
                      setInputFileName(m.fileName);
                    }}
                  />
                ))}
                <div
                  ref={observerTarget}
                  className="h-8 flex items-center justify-center p-4"
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

          {/* URL Input */}
          <div className="p-6 space-y-4 border-t border-border/50 bg-background">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={12} className="text-muted-foreground" />
              <label className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                外部链接
              </label>
            </div>
            <div className="group relative">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  if (selectedMedia) setSelectedMedia(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="https://example.com/file.gp5"
                className="w-full bg-transparent border-b border-border text-foreground font-mono text-sm py-2 pl-4 focus:border-foreground focus:outline-none transition-all placeholder:text-muted-foreground/20"
              />
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-0 border-t border-border/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-4 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors border-r border-border/50"
          >
            [ 取消 ]
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!inputUrl.trim()}
            className="flex-1 px-6 py-4 text-[10px] font-mono font-bold uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground"
          >
            [ 确认 ]
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const GuitarProModal: React.FC<GuitarProModalProps> = (props) => (
  <ClientOnly>
    <GuitarProModalInternal {...props} />
  </ClientOnly>
);

export default GuitarProModal;
