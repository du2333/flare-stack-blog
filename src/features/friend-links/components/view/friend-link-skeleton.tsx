export function FriendLinkSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-transparent animate-pulse">
      {/* Logo Skeleton */}
      <div className="shrink-0 w-10 h-10 rounded-md bg-muted/20" />

      <div className="flex-1 space-y-2 py-0.5">
        {/* Title Skeleton */}
        <div className="flex justify-between gap-4">
          <div className="h-4 w-1/3 bg-muted/20 rounded" />
          <div className="h-3 w-1/4 bg-muted/10 rounded hidden sm:block" />
        </div>

        {/* Description Skeleton */}
        <div className="space-y-1.5 pt-1">
          <div className="h-3 w-full bg-muted/10 rounded" />
          <div className="h-3 w-4/5 bg-muted/10 rounded" />
        </div>
      </div>
    </div>
  );
}
