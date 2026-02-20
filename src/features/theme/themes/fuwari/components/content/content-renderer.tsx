import { useMemo } from "react";
import type { JSONContent } from "@tiptap/react";
import { renderReact } from "@/features/theme/themes/fuwari/components/content/render";
import { cn } from "@/lib/utils";

interface ContentRendererProps {
  content: JSONContent | null;
  className?: string;
}

/**
 * Fuwari Content Renderer:
 * Resolves standard Tiptap AST into React components tailored for the Fuwari theme (like Expressive Code).
 */
export function ContentRenderer({ content, className }: ContentRendererProps) {
  const renderedContent = useMemo(() => {
    if (!content) return null;
    return renderReact(content);
  }, [content]);

  if (!content) {
    return null;
  }

  return <div className={cn(className)}>{renderedContent}</div>;
}
