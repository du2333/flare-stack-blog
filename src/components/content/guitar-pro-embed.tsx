"use client";

import { ClientOnly } from "@tanstack/react-router";
import { Music, Play } from "lucide-react";
import { lazy, Suspense, useState } from "react";

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

  // 确保 src 带 ?original=true 以跳过图片变换
  const fileUrl = src.includes("?") ? src : `${src}?original=true`;

  return (
    <>
      <div className="my-6 border border-border/50 bg-muted/5 hover:bg-muted/10 transition-colors not-prose">
        <button
          onClick={() => setIsViewerOpen(true)}
          className="w-full flex items-center gap-4 p-4 text-left cursor-pointer group"
        >
          {/* 图标 */}
          <div className="shrink-0 w-12 h-12 flex items-center justify-center bg-foreground/5 group-hover:bg-foreground/10 transition-colors">
            <Music size={20} className="text-muted-foreground" />
          </div>

          {/* 信息 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {fileName || "Guitar Pro 吉他谱"}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5">
              点击播放 · Guitar Pro
            </p>
          </div>

          {/* 播放按钮 */}
          <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-foreground text-background group-hover:scale-105 transition-transform">
            <Play size={16} />
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
                  <div className="w-8 h-8 border-2 border-t-foreground border-r-transparent border-b-transparent border-l-transparent animate-spin" />
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
              onClose={() => setIsViewerOpen(false)}
            />
          </Suspense>
        </ClientOnly>
      )}
    </>
  );
}
