import type { JSONContent } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { renderCommentReact } from "./comment-render";

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
          {expanded ? m.common_collapse() : m.common_expand_all()}
        </button>
      )}
    </div>
  );
}
