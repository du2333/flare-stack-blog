import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import "@/components/ui/tabs.css";

/**
 * The primary action's place in a loading page's header (AdminPage
 * `actions`), so nothing moves when the page arrives. The top bar has the
 * action below 1024px, so it is hidden there.
 */
export function FrameActionSkeleton() {
  return <Skeleton className="h-9 w-24 rounded-lg max-lg:hidden" />;
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
