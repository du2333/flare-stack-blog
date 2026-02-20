import { useEffect, useRef, useState } from "react";
import { renderCommentReact } from "./comment-render";
import type { JSONContent } from "@tiptap/react";
import { cn } from "@/lib/utils";

interface ExpandableContentProps {
  content: JSONContent | null;
  className?: string;
  maxLines?: number;
}

export function ExpandableContent({
  content,
  className,
  maxLines = 6,
}: ExpandableContentProps) {
  const [expanded, setExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const isOverflowing =
        contentRef.current.scrollHeight > contentRef.current.clientHeight;
      setShowButton(isOverflowing);
    }
  }, [content]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={contentRef}
        className={cn(
          "max-w-none text-sm transition-all duration-300 prose dark:prose-invert prose-sm fuwari-custom-md",
          !expanded && "overflow-hidden",
        )}
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: expanded ? "unset" : maxLines,
        }}
      >
        {renderCommentReact(content)}
      </div>

      {showButton && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 text-xs text-(--fuwari-primary) hover:text-(--fuwari-primary-hover) font-medium transition-colors"
        >
          {expanded ? "收起" : "展开全部"}
        </button>
      )}
    </div>
  );
}
