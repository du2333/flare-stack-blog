import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import "./badge.css";

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";

/**
 * A short status or tag label. With `onRemove` it is a chip: a button after
 * the label, named by `removeLabel`, takes it away.
 */
export function Badge({
  tone = "neutral",
  size = "md",
  className,
  children,
  onRemove,
  removeLabel,
  ...props
}: ComponentProps<"span"> & {
  tone?: BadgeTone;
  size?: "sm" | "md";
} & (
    | { onRemove?: undefined; removeLabel?: undefined }
    | { onRemove: () => void; removeLabel: string }
  )) {
  return (
    <span
      {...props}
      className={cn("fuwari-badge", className)}
      data-tone={tone}
      data-size={size}
      data-removable={onRemove ? "" : undefined}
    >
      {onRemove ? (
        <>
          <span className="fuwari-badge-label">{children}</span>
          <button
            type="button"
            className="fuwari-badge-remove"
            aria-label={removeLabel}
            title={removeLabel}
            onClick={onRemove}
          >
            <X size={12} aria-hidden="true" />
          </button>
        </>
      ) : (
        children
      )}
    </span>
  );
}
