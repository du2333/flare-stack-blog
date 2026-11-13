import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** The large tinted icon tile that heads a status screen. */
export function StatusIcon({
  icon: Icon,
  tone = "primary",
  spin = false,
  className,
}: {
  icon: LucideIcon;
  tone?: "primary" | "danger";
  spin?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid size-14 place-items-center rounded-2xl",
        tone === "danger"
          ? "bg-(--fuwari-danger-bg) text-(--fuwari-danger-fg)"
          : "bg-(--theme-tonal-bg) text-(--theme-accent)",
        className,
      )}
      aria-hidden="true"
    >
      <Icon
        size={28}
        strokeWidth={1.5}
        className={spin ? "animate-spin" : undefined}
      />
    </div>
  );
}
