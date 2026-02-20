import { useEffect, useRef, useState } from "react";
import { renderCommentReact } from "./comment-render";
import type { JSONContent } from "@tiptap/react";
import { cn } from "@/lib/utils";

interface ExpandableContentProps {
  content: JSONContent | null;
  className?: string;
  maxLines?: number; // Default 3
}

export function ExpandableContent({
  content,
  className,
  maxLines = 3,
}: ExpandableContentProps) {
  const [expanded, setExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      // Check if content is overflowing
      // We compare scrollHeight (total height) with clientHeight (visible height)
      // Note: This relies on line-clamp being applied initially
      const isOverflowing =
        contentRef.current.scrollHeight > contentRef.current.clientHeight;
      setShowButton(isOverflowing);
    }
  }, [content]); // Re-check if content changes

  return (
    <div className={cn("relative group", className)}>
      <div
        ref={contentRef}
        className={cn(
          "max-w-none text-sm transition-all duration-300",
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
          className="mt-1 text-xs text-muted-foreground hover:text-primary font-medium hover:underline flex items-center gap-1"
        >
          {expanded ? "收起" : "展开全部"}
        </button>
      )}
    </div>
  );
}
