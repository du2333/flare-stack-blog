import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div
      data-admin-legacy
      className="space-y-8 animate-in fade-in duration-500 max-w-300 mx-auto"
    >
      <header className="border-b border-border/30 pb-6">
        <Skeleton className="h-9 w-28" />
      </header>

      <div className="space-y-4">
        <Skeleton className="h-3 w-20" />
        <div className="border border-border/30 divide-y divide-border/30">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-4 px-4 py-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Array.from({ length: 2 }).map((_, column) => (
          <div key={column} className="space-y-4">
            <Skeleton className="h-3 w-24" />
            <div className="border border-border/30 divide-y divide-border/30">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-4 py-4 space-y-2">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
