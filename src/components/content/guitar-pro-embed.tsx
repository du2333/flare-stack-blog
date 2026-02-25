"use client";

import { ClientOnly } from "@tanstack/react-router";
import { Music, Play } from "lucide-react";
import { lazy, Suspense, useCallback, useRef, useState } from "react";

const GuitarProViewerLazy = lazy(
  () =>
    import(
      "@/features/media/components/guitar-pro-viewer/guitar-pro-viewer"
    ),
);

interface GuitarProEmbedProps {
  src: string;
  fileName: string;
}

/**
 * 博客文章中嵌入的 Guitar Pro 播放器块
 * 显示一个卡片，点击后打开全屏播放器
 */
export function GuitarProEmbed({ src, fileName }: GuitarProEmbedProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const cardRef = useRef<HTMLButtonElement>(null);
  const [originRect, setOriginRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | undefined>();

  // 确保 src 带 ?original=true 以跳过图片变换
  const fileUrl = src.includes("?") ? src : `${src}?original=true`;

  const handleOpen = () => {
    if (cardRef.current) {
      const r = cardRef.current.getBoundingClientRect();
      setOriginRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    setIsViewerOpen(true);
  };

  const handleClose = useCallback(() => {
    setIsViewerOpen(false);
    // 关闭后将卡片滚动回可见区域
    setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }, []);

  return (
    <>
      <div className="my-6 not-prose">
        <button
          ref={cardRef}
          onClick={handleOpen}
          className="w-full rounded-xl border border-border/50 bg-card text-left cursor-pointer group overflow-hidden transition-all duration-300 ease-out hover:border-accent/30 hover:shadow-[0_2px_16px_-4px_hsl(var(--accent)/0.1)]"
        >
          <div className="flex items-center gap-4 p-4">
            {/* 图标 */}
            <div className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center bg-accent/8 group-hover:bg-accent/12 transition-all duration-300">
              <Music size={18} className="text-accent/70 group-hover:text-accent transition-colors duration-300" />
            </div>

            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-accent transition-colors duration-300">
                {fileName || "Guitar Pro 吉他谱"}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider mt-0.5">
                点击播放 · Guitar Pro
              </p>
            </div>

            {/* 播放按钮 */}
            <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-accent/10 text-accent transition-all duration-300 group-hover:bg-accent group-hover:text-accent-foreground group-hover:scale-105 group-active:scale-95">
              <Play size={14} className="ml-0.5" />
            </div>
          </div>
        </button>
      </div>

      {/* 全屏查看器 */}
      {isViewerOpen && (
        <ClientOnly>
          <Suspense
            fallback={
              <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-md flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                    加载 Guitar Pro 引擎...
                  </span>
                </div>
              </div>
            }
          >
            <GuitarProViewerLazy
              isOpen={isViewerOpen}
              fileUrl={fileUrl}
              fileName={fileName}
              onClose={handleClose}
              originRect={originRect}
            />
          </Suspense>
        </ClientOnly>
      )}
    </>
  );
}
