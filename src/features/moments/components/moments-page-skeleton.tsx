import { Skeleton } from "@/components/ui/skeleton";

/** The card of one Moment while it loads. */
function MomentCardSkeleton() {
  return (
    <div className="fuwari-card-base flex flex-col gap-3 p-5 md:p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

export function MomentsPageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }, (_, i) => (
        <MomentCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function MomentPageSkeleton() {
  return <MomentCardSkeleton />;
}
