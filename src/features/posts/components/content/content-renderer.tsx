import type { JSONContent } from "@tiptap/react";
import { lazy, Suspense, useLayoutEffect, useMemo } from "react";
import { jsonContentHasType } from "@/features/posts/utils/content";
import { cn } from "@/lib/utils";
import { renderReact } from "./render";

const MathContent = lazy(() => import("./math-content"));

interface ContentRendererProps {
  content: JSONContent | null;
  className?: string;
}

export function ContentRenderer({ content, className }: ContentRendererProps) {
  const hasMath = jsonContentHasType(content, ["inlineMath", "blockMath"]);
  const hasCode = jsonContentHasType(content, "codeBlock");

  useLayoutEffect(() => {
    if (!hasCode) return;
    void import("@fontsource-variable/jetbrains-mono/wght.css");
  }, [hasCode]);

  const renderedContent = useMemo(() => {
    if (!content || hasMath) return null;
    return renderReact(content);
  }, [content, hasMath]);

  if (!content) {
    return null;
  }

  if (hasMath) {
    return (
      <Suspense fallback={<div className={cn(className)} />}>
        <MathContent content={content} className={className} />
      </Suspense>
    );
  }

  return <div className={cn(className)}>{renderedContent}</div>;
}
