import { Skeleton } from "@/components/ui/skeleton";

export function FriendLinksPageSkeleton() {
  return (
    <div className="flex flex-col gap-4 w-full">
      <Skeleton className="w-full min-h-56 rounded-2xl" />
      <div className="fuwari-card-base p-6 md:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-4 flex items-center gap-4 rounded-2xl bg-black/5 dark:bg-white/5"
            >
              <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
