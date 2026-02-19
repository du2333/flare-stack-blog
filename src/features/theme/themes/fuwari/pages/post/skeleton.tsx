import { ChevronLeft, ChevronRight } from "lucide-react";
import { config } from "../../config";
import { Skeleton } from "@/components/ui/skeleton";

export function PostPageSkeleton() {
  const limit = config.post.relatedPostsLimit;

  return (
    <div className="flex flex-col rounded-(--fuwari-radius-large) bg-(--fuwari-card-bg) py-1 md:py-0 md:bg-transparent md:gap-4 mb-4">
      {/* Main Post Card Layout */}
      <div className="fuwari-card-base z-10 px-6 md:px-9 pt-6 pb-4 relative w-full mb-4">
        {/* word count and reading time skeleton */}
        <div className="flex flex-row gap-5 mb-3">
          <div className="flex flex-row items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex flex-row items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        {/* title skeleton */}
        <div className="mb-3 before:hidden md:before:block relative">
          <Skeleton className="h-10 w-3/4 rounded-md md:h-12" />
        </div>

        {/* metadata skeleton */}
        <div className="mb-5 flex flex-wrap items-center gap-4 gap-x-4 gap-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>

        <div className="border-(--fuwari-meta-divider) border-dashed border-b mb-5"></div>

        {/* Content Skeleton */}
        <div className="mb-6 space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[95%]" />
          <Skeleton className="h-4 w-[85%]" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[80%]" />
          <Skeleton className="h-4 w-[92%]" />
          <Skeleton className="h-50 w-full rounded-xl my-6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[85%]" />
        </div>
      </div>

      {/* Prev/Next buttons skeleton */}
      <div className="flex flex-col md:flex-row justify-between mb-4 gap-4 overflow-hidden w-full">
        <div className="w-full h-15 fuwari-card-base rounded-2xl px-4 flex items-center justify-start gap-4">
          <ChevronLeft className="text-[2rem] text-(--fuwari-primary) opacity-50" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="w-full h-15 fuwari-card-base rounded-2xl px-4 flex items-center justify-end gap-4">
          <Skeleton className="h-5 w-48" />
          <ChevronRight className="text-[2rem] text-(--fuwari-primary) opacity-50" />
        </div>
      </div>

      {/* Related Posts skeleton */}
      {limit > 0 && (
        <div className="fuwari-card-base p-6 mb-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="flex flex-col gap-4">
            {Array.from({ length: limit }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Comments Skeleton */}
      <div className="fuwari-card-base p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-50 w-full rounded-xl" />
      </div>
    </div>
  );
}
