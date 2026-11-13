import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * An option row in a popover listbox whose focus stays elsewhere (a search
 * box, the editor) while arrow keys move the active option. Pressing a row
 * keeps that focus, hovering it makes it the active option, and clicking
 * picks it. `current` marks the value already chosen.
 */
export function ListboxOption({
  id,
  active,
  current = false,
  onActivate,
  onPick,
  className,
  children,
}: {
  id: string;
  active: boolean;
  current?: boolean;
  onActivate: () => void;
  onPick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      onMouseDown={(event) => event.preventDefault()}
      onMouseMove={onActivate}
      onClick={onPick}
      className={cn(
        "flex cursor-pointer items-center rounded-lg py-1.5 text-sm transition-colors",
        active && "bg-(--theme-tonal-bg)",
        current
          ? "text-(--theme-accent)"
          : active
            ? "fuwari-text-90"
            : "fuwari-text-75",
        className,
      )}
    >
      {children}
    </div>
  );
}
