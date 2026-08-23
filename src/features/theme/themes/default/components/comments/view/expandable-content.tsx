import { useEffect, useRef, useState } from "react";
import { CommentBody } from "@/features/comments/components/comment-body";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface ExpandableContentProps {
  content: string | null;
  className?: string;
  maxLines?: number;
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
      const isOverflowing =
        contentRef.current.scrollHeight > contentRef.current.clientHeight;
      setShowButton(isOverflowing);
    }
  }, [content]);

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
        <CommentBody
          content={content}
          linkClassName="underline underline-offset-4 decoration-border hover:decoration-foreground transition-all duration-300 break-all"
        />
      </div>

      {showButton && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs text-muted-foreground hover:text-primary font-medium hover:underline flex items-center gap-1"
        >
          {expanded ? m.common_collapse() : m.common_expand_all()}
        </button>
      )}
    </div>
  );
}
