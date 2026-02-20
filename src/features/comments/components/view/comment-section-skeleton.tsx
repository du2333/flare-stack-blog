import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const CommentSectionSkeleton = ({
  className,
}: {
  className?: string;
}) => {
  return (
    <section
      className={cn(
        "space-y-12 mt-24 pt-12 border-t border-border/20 animate-in fade-in duration-700",
        className,
      )}
    >
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-32" />
        </div>
      </header>

      {/* Main Editor Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-sm" />
        <div className="flex justify-end">
          <Skeleton className="h-10 w-24 rounded-sm" />
        </div>
      </div>

      {/* Comments List Skeleton */}
      <div className="divide-y divide-border/10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="py-8 space-y-4">
            <div className="flex gap-5">
              <Skeleton className="w-8 h-8 rounded-full shrink-0 opacity-50" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-2 w-12" />
                  </div>
                  <Skeleton className="h-2 w-16" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-full opacity-80" />
                  <Skeleton className="h-3 w-full opacity-60" />
                  <Skeleton className="h-3 w-2/3 opacity-40" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
