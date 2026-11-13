import { useLayoutEffect, useId, useRef, useState } from "react";
import { CommentBody } from "@/features/comments/components/comment-body";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

export function ExpandableContent({
  content,
  className,
  maxLines = 6,
}: {
  content: string | null;
  className?: string;
  maxLines?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [size, setSize] = useState<{ full: number; collapsed: number } | null>(
    null,
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const id = useId();
  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    const measure = () => {
      const full = element.getBoundingClientRect().height;
      const collapsed = Math.min(
        full,
        parseFloat(getComputedStyle(element).lineHeight) * maxLines,
      );
      setSize((previous) =>
        previous?.full === full && previous.collapsed === collapsed
          ? previous
          : { full, collapsed },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [content, maxLines]);
  return (
    <div className={className}>
      <div
        id={id}
        className="comment-body-height"
        style={{
          height: size ? (expanded ? size.full : size.collapsed) : undefined,
          maxHeight: !size && !expanded ? `${maxLines * 1.7}em` : undefined,
        }}
      >
        <div ref={contentRef} className="comment-body-text">
          <CommentBody
            content={content}
            linkClassName="underline underline-offset-4 decoration-(--theme-accent)/40 hover:decoration-(--theme-accent) text-(--theme-accent) transition-all duration-300 break-all"
          />
        </div>
      </div>
      {size && size.full > size.collapsed + 1 && (
        <Button
          variant="text"
          size="sm"
          className="comment-thread-toggle"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? m.common_collapse() : m.common_expand_all()}
        </Button>
      )}
    </div>
  );
}
