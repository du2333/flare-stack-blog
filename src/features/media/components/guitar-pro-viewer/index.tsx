import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { GuitarProViewerProps } from "./types";

const GuitarProViewerLazy = lazy(() => import("./guitar-pro-viewer"));

const LoadingFallback = () => (
  <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-md flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-t-foreground border-r-transparent border-b-transparent border-l-transparent animate-spin" />
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
        加载 Guitar Pro 引擎...
      </span>
    </div>
  </div>
);

/**
 * Guitar Pro 查看器入口 — 懒加载 alphaTab（约 1.3MB SoundFont + 渲染引擎）
 * 使用 ClientOnly 确保不在 SSR 中运行
 */
export function GuitarProViewer(props: GuitarProViewerProps) {
  if (!props.isOpen) return null;

  return (
    <ClientOnly fallback={<LoadingFallback />}>
      <Suspense fallback={<LoadingFallback />}>
        <GuitarProViewerLazy {...props} />
      </Suspense>
    </ClientOnly>
  );
}
