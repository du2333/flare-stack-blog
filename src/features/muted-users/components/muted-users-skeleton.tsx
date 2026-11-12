import { Skeleton } from "@/components/ui/skeleton";

/** Rows as tall as the real ones. */
export function MutedUsersListSkeleton() {
  return (
    <div
      className="muted-list"
      role="status"
      aria-busy="true"
      aria-hidden="true"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="admin-list-row muted-row" data-skeleton="">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-1/4 rounded" />
          <Skeleton className="ml-auto h-3 w-28 rounded" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
