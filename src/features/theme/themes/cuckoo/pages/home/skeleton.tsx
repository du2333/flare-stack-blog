export function HomePageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome Banner Skeleton */}
      <div className="cuckoo-card p-6 md:p-8">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>

      {/* Post Cards Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="cuckoo-card p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
