import type * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

function Textarea({
  ref,
  className,
  ...props
}: TextareaProps & { ref?: React.Ref<HTMLTextAreaElement> }) {
  return (
    <textarea
      className={cn(
        "flex min-h-20 w-full rounded-none border-b border-input bg-transparent px-0 py-2 text-sm transition-all placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:border-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 resize-y",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
}
Textarea.displayName = "Textarea";

export { Textarea };
