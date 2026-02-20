import { Skeleton } from "@/components/ui/skeleton";

export function FriendLinksPageSkeleton() {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header Banner representing the current page */}
      <div className="fuwari-card-base p-6 md:p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-56 bg-linear-to-br from-(--fuwari-primary)/5 to-transparent">
        <Skeleton className="h-9 md:h-10 w-32 mb-4" />
        <Skeleton className="h-6 w-full max-w-xl" />
        <Skeleton className="mt-6 h-10 w-28 rounded-xl" />
      </div>

      {/* Links Grid */}
      <div className="fuwari-card-base p-6 md:p-8 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="fuwari-card-base block relative p-4">
              <div className="flex items-center gap-4">
                {/* Avatar Area Skeleton */}
                <Skeleton className="shrink-0 relative w-16 h-16 rounded-2xl" />

                {/* Content Area Skeleton */}
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <Skeleton className="h-6 w-24 mb-1" />
                  <Skeleton className="h-4 w-full mt-1 mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
