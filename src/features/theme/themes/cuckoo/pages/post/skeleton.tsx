export function PostPageSkeleton() {
  return (
    <article className="space-y-8">
      {/* Back Button Skeleton */}
      <div className="animate-pulse h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />

      {/* Header Skeleton */}
      <header className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="flex gap-4">
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        </div>
      </header>

      {/* Content Skeleton */}
      <div className="cuckoo-card p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
      </div>
    </article>
  );
}
