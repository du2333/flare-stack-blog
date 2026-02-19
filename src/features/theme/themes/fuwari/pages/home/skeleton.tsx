import { Skeleton } from "@/components/ui/skeleton";

export function HomePageSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[17.5rem_1fr] gap-4">
      {/* Sidebar skeleton */}
      <aside className="flex flex-col gap-4">
        <div className="fuwari-card-base p-4">
          <Skeleton className="mx-auto mb-3 w-48 h-48 rounded-xl" />
          <Skeleton className="h-6 w-24 mx-auto mb-2" />
          <Skeleton className="h-1 w-5 mx-auto mb-2 rounded-full" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mx-auto mb-2" />
          <div className="flex justify-center gap-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </div>
        <div className="fuwari-card-base p-4">
          <Skeleton className="h-5 w-20 mb-3" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-16 rounded-lg" />
            ))}
          </div>
        </div>
      </aside>

      {/* Post cards skeleton */}
      <main className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="fuwari-card-base p-6">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <div className="flex gap-4 mb-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-2" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </main>
    </div>
  );
}
