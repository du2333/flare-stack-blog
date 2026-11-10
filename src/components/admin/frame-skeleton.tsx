import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import "@/components/ui/tabs.css";

/**
 * A workspace's title row while it loads: the real title and description, a
 * placeholder for the primary action, so nothing moves when the page arrives.
 */
export function FrameHeaderSkeleton({
  title,
  description = "—",
  action = true,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: boolean;
}) {
  return (
    <PageHeader
      title={title}
      description={description}
      actions={
        action ? (
          <Skeleton className="h-(--fuwari-button-height) w-24 rounded-xl" />
        ) : undefined
      }
    />
  );
}

/** Tabs as tall as the real ones, with placeholder labels. */
export function FrameTabsSkeleton({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <div className={cn("fuwari-tabs", className)}>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="fuwari-tab">
          <Skeleton className="h-4 w-16 rounded" />
        </span>
      ))}
    </div>
  );
}
