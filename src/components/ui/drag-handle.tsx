import { GripVertical } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import "./drag-handle.css";

/**
 * The grip a row is dragged by to reorder it. The row's sorting gives it the
 * pointer and key handlers; `label` names what moves.
 */
export function DragHandle({
  label,
  className,
  ...props
}: Omit<ComponentProps<"button">, "aria-label" | "children" | "type"> & {
  label: string;
}) {
  return (
    <button
      type="button"
      {...props}
      aria-label={label}
      className={cn("fuwari-drag-handle", className)}
    >
      <GripVertical size={18} aria-hidden="true" />
    </button>
  );
}
