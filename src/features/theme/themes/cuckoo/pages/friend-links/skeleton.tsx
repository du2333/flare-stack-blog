export function FriendLinksPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Banner Skeleton */}
      <div className="cuckoo-card p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mx-auto" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto" />
        </div>
      </div>

      {/* Links Grid Skeleton */}
      <div className="cuckoo-card p-6 md:p-8">
        <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
