import "katex/dist/katex.min.css";
import type { JSONContent } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { renderReactWithMath } from "./render-math";

export default function MathContent({
  content,
  className,
}: {
  content: JSONContent;
  className?: string;
}) {
  return <div className={cn(className)}>{renderReactWithMath(content)}</div>;
}
