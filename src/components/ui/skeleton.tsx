import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import "./skeleton.css";

/**
 * A pulsing placeholder block; size and round it with `className`. With
 * `shimmer` (the Admin's redesigned pages) a light band sweeps across it
 * instead; it is a span, so it can sit in a line of text.
 */
function Skeleton({
  className,
  shimmer = false,
  ...props
}: ComponentProps<"div"> & { shimmer?: boolean }) {
  if (shimmer)
    return (
      <span
        aria-hidden="true"
        className={cn("fuwari-skeleton-shimmer", className)}
        {...(props as ComponentProps<"span">)}
      />
    );
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-lg bg-(--theme-tonal-bg)",
        className,
      )}
      {...props}
    />
  );
}

/** Ruled list rows, each an avatar beside lines of the given classes. */
function SkeletonListRows({
  count,
  avatar,
  lines,
}: {
  count: number;
  avatar: "circle" | "square";
  lines: Array<string>;
}) {
  return (
    <div>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="px-4 py-4 flex gap-3 border-b border-(--fuwari-input-border) last:border-0"
        >
          <Skeleton
            className={cn(
              "w-10 h-10",
              avatar === "circle" ? "rounded-full" : "rounded-xl",
            )}
          />
          <div className="flex-1 space-y-2">
            {lines.map((line) => (
              <Skeleton key={line} className={line} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonListRows };
