import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </header>

      {/* Stats Grid */}
      <div className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-16" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="p-6 border border-border/30 rounded-sm space-y-4"
              >
                <div className="flex justify-between items-start">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-5 rounded-sm" />
                </div>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-2 w-24" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Skeleton className="h-3 w-12" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="p-6 border border-border/30 rounded-sm space-y-4"
                >
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-3 w-12" />
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 border border-border/30 rounded-sm space-y-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visuals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Graph Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-row justify-between items-baseline border-b border-border/50 pb-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2 w-32" />
          </div>
          <div className="h-72 w-full flex items-end gap-1.5 md:gap-3">
            {Array.from({ length: 24 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t-[1px]"
                style={{ height: `${Math.random() * 70 + 10}%` }}
              />
            ))}
          </div>
        </div>

        {/* Activity Log Skeleton */}
        <div className="space-y-6">
          <div className="flex flex-row justify-between items-baseline border-b border-border/50 pb-4">
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
