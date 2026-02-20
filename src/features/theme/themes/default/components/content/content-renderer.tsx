import { useMemo } from "react";
import type { JSONContent } from "@tiptap/react";
import { renderReact } from "@/features/theme/themes/default/components/content/render";
import { cn } from "@/lib/utils";

interface ContentRendererProps {
  content: JSONContent | null;
  className?: string;
}

/**
 * 内容渲染组件：使用 React 静态渲染器渲染 Tiptap JSON 内容
 * 服务器端渲染 React 组件，客户端 hydration 后自动激活交互功能
 */
export function ContentRenderer({ content, className }: ContentRendererProps) {
  const renderedContent = useMemo(() => {
    if (!content) return null;
    return renderReact(content);
  }, [content]);

  if (!content) {
    return null;
  }

  return <div className={cn("ProseMirror", className)}>{renderedContent}</div>;
}
