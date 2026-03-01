import { useMemo } from "react";
import { renderReact } from "./render";
import type { JSONContent } from "@tiptap/react";

interface ContentRendererProps {
  content: JSONContent;
}

export function ContentRenderer({ content }: ContentRendererProps) {
  const rendered = useMemo(() => {
    try {
      return renderReact(content);
    } catch (error) {
      console.error("Failed to render content:", error);
      return <div className="text-red-500">内容渲染失败</div>;
    }
  }, [content]);

  return (
    <div className="cuckoo-content prose prose-sm md:prose-base dark:prose-invert max-w-none">
      {rendered}
    </div>
  );
}
