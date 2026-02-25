import { useQuery } from "@tanstack/react-query";
import { Check, Film, Guitar, Headphones, Image as ImageIcon } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { useLongPress } from "../hooks";
import type { MediaAsset } from "../types";
import {
  getOptimizedImageUrl,
  isGuitarProFile,
  isVideoFile,
  isAudioFile,
} from "@/features/media/media.utils";
import { guitarTabMetaQuery } from "@/features/media/queries";
import { formatBytes } from "@/lib/utils";

interface MediaGridProps {
  media: Array<MediaAsset>;
  selectedIds: Set<string>;
  onToggleSelect: (key: string) => void;
  onPreview: (asset: MediaAsset) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  linkedMediaIds: Set<string>;
  onRefetch?: () => void;
}

const MediaCard = memo(
  ({
    asset,
    isSelected,
    isLinked,
    isImage,
    onToggleSelect,
    onPreview,
    selectionModeActive,
  }: {
    asset: MediaAsset;
    isSelected: boolean;
    isLinked: boolean;
    isImage: boolean;
    onToggleSelect: (key: string) => void;
    onPreview: (asset: MediaAsset) => void;
    selectionModeActive: boolean;
  }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const thumbnailUrl = getOptimizedImageUrl(asset.key);
    const isGp = isGuitarProFile(asset.fileName);
    const { data: gpMeta } = useQuery({
      ...guitarTabMetaQuery(asset.id),
      enabled: isGp,
    });
    const [isCoverLoaded, setIsCoverLoaded] = useState(false);

    const handleStandardClick = () => {
      // Direct preview on click unless in explicit selection mode (multi-select triggered by checkbox)
      // or if shift key is pressed (range select - future feature)
      // For now, simple logic:
      // Click image -> Preview
      // Click checkbox -> Select
      if (selectionModeActive) {
        onToggleSelect(asset.key);
      } else {
        onPreview(asset);
      }
    };

    const handleLongPress = () => {
      onToggleSelect(asset.key);
    };

    const longPressHandlers = useLongPress(
      handleLongPress,
      handleStandardClick,
      {
        delay: 500,
      },
    );

    return (
      <div
        {...longPressHandlers}
        className={`group relative flex flex-col cursor-pointer transition-all duration-300 touch-manipulation select-none overflow-hidden rounded-none border ${
          isSelected
            ? "border-foreground bg-accent/20"
            : isLinked
              ? "border-emerald-500/50 bg-emerald-500/5"
              : "border-border/50 hover:border-foreground/50"
        }`}
      >
        {/* Selection Indicator (Top Left) */}
        <div
          className={`absolute top-0 left-0 z-30 p-2 transition-all duration-200 ${
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(asset.key);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div
            className={`w-4 h-4 border flex items-center justify-center transition-colors ${
              isSelected
                ? "bg-foreground border-foreground"
                : "bg-background/80 backdrop-blur-sm border-muted-foreground/50 hover:border-foreground"
            }`}
          >
            {isSelected && (
              <Check size={10} className="text-background" strokeWidth={3} />
            )}
          </div>
        </div>

        {/* Linked Indicator */}
        {isLinked && (
          <div className="absolute top-0 right-0 z-20 px-2 py-1 bg-emerald-500 text-white text-[9px] font-mono tracking-wider uppercase">
            已引用
          </div>
        )}

        {/* Preview */}
        <div className="aspect-square relative overflow-hidden bg-muted/20 border-b border-border/30">
          {isImage ? (
            <>
              {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/20 animate-pulse">
                  <ImageIcon size={20} className="text-muted-foreground/30" />
                </div>
              )}
              <img
                src={thumbnailUrl}
                alt={asset.fileName}
                className={`w-full h-full object-cover transition-all duration-500 ${
                  isLoaded ? "opacity-100" : "opacity-0"
                } ${isSelected ? "opacity-50" : ""}`}
                onLoad={() => setIsLoaded(true)}
              />
            </>
          ) : isGuitarProFile(asset.fileName) ? (
            <div className="w-full h-full relative">
              {gpMeta?.coverKey ? (
                <>
                  {!isCoverLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/20 animate-pulse">
                      <Guitar size={20} className="text-muted-foreground/30" />
                    </div>
                  )}
                  <img
                    src={getOptimizedImageUrl(gpMeta.coverKey, 300)}
                    alt={gpMeta.title ?? asset.fileName}
                    className={`w-full h-full object-cover transition-all duration-500 ${isCoverLoaded ? "opacity-100" : "opacity-0"} ${isSelected ? "opacity-50" : ""}`}
                    onLoad={() => setIsCoverLoaded(true)}
                  />
                  {/* GP badge */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                    <div className="flex items-center gap-1.5">
                      <Guitar size={10} className="text-white/80" />
                      <span className="text-[9px] font-mono uppercase tracking-wider text-white/90 truncate">
                        {gpMeta.title || "Guitar Pro"}
                      </span>
                    </div>
                    {gpMeta.artist && (
                      <span className="text-[8px] font-mono text-white/60 truncate block mt-0.5 pl-4">
                        {gpMeta.artist}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Guitar size={28} strokeWidth={1} />
                  {gpMeta?.title ? (
                    <div className="text-center px-2">
                      <span className="text-[9px] font-mono block truncate max-w-full">
                        {gpMeta.title}
                      </span>
                      {gpMeta.artist && (
                        <span className="text-[8px] font-mono opacity-50 block truncate max-w-full">
                          {gpMeta.artist}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[9px] font-mono uppercase tracking-wider opacity-60">
                      Guitar Pro
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : isVideoFile(asset.fileName) ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Film size={28} strokeWidth={1} />
              <span className="text-[9px] font-mono uppercase tracking-wider opacity-60">
                视频
              </span>
            </div>
          ) : isAudioFile(asset.fileName) ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Headphones size={28} strokeWidth={1} />
              <span className="text-[9px] font-mono uppercase tracking-wider opacity-60">
                音频
              </span>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Film size={24} strokeWidth={1} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 space-y-1.5 bg-background">
          <div className="text-[10px] font-mono font-medium truncate text-foreground group-hover:text-foreground transition-colors">
            {asset.fileName}
          </div>
          <div className="flex justify-between items-center text-[9px] text-muted-foreground font-mono tracking-wider uppercase border-t border-border/30 pt-1.5">
            <span>{formatBytes(asset.sizeInBytes)}</span>
            <span>{asset.mimeType.split("/")[1]}</span>
          </div>
        </div>
      </div>
    );
  },
);

MediaCard.displayName = "MediaCard";

export function MediaGrid({
  media,
  selectedIds,
  onToggleSelect,
  onPreview,
  onLoadMore,
  hasMore,
  isLoadingMore,
  linkedMediaIds,
  onRefetch,
}: MediaGridProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          onLoadMore
        ) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, onLoadMore]);

  if (media.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-4 border border-dashed border-border/30 bg-muted/5">
        <ImageIcon size={32} strokeWidth={1} className="opacity-20" />
        <div className="text-center font-mono text-xs">
          <span className="uppercase tracking-widest block mb-2">
            未找到媒体资产
          </span>
          {onRefetch && (
            <button
              onClick={onRefetch}
              className="text-[10px] uppercase tracking-widest font-bold hover:underline opacity-50 hover:opacity-100"
            >
              [ 刷新列表 ]
            </button>
          )}
        </div>
      </div>
    );
  }

  const selectionModeActive = selectedIds.size > 0;

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
        {media.map((asset) => {
          const isSelected = selectedIds.has(asset.key);
          const isLinked = linkedMediaIds.has(asset.key);
          const isImage = asset.mimeType.startsWith("image/");

          return (
            <MediaCard
              key={asset.key}
              asset={asset}
              isSelected={isSelected}
              isLinked={isLinked}
              isImage={isImage}
              onToggleSelect={onToggleSelect}
              onPreview={onPreview}
              selectionModeActive={selectionModeActive}
            />
          );
        })}
      </div>

      {/* Loading / Sentinel */}
      <div
        ref={observerTarget}
        className="py-12 flex flex-col items-center justify-center gap-4"
      >
        {isLoadingMore ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-none border-2 border-t-foreground border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground animate-pulse">
              加载资产中...
            </span>
          </div>
        ) : !hasMore && media.length > 0 ? (
          <div className="flex items-center gap-2 opacity-50">
            <div className="h-px w-12 bg-border" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
              已加载全部
            </span>
            <div className="h-px w-12 bg-border" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
