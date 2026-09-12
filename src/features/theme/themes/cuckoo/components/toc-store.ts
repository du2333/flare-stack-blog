import { useSyncExternalStore } from "react";
import type { TableOfContentsItem } from "@/features/posts/utils/toc";

/**
 * 文章目录的模块级共享 store:
 * PostPage 写入当前文章的目录,侧栏订阅渲染(对应原主题侧栏 #toc 模块)。
 * 服务端渲染时始终为空,客户端挂载后注入,避免水合不一致。
 */
let currentToc: Array<TableOfContentsItem> = [];
const listeners = new Set<() => void>();

export function setSidebarToc(items: Array<TableOfContentsItem>): void {
  currentToc = items;
  for (const listener of listeners) {
    listener();
  }
}

export function useSidebarToc(): Array<TableOfContentsItem> {
  return useSyncExternalStore(
    subscribe,
    () => currentToc,
    () => [],
  );
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
