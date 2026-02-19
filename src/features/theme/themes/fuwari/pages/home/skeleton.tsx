import { ChevronRight } from "lucide-react";
import { config } from "../../config";
import { Skeleton } from "@/components/ui/skeleton";

export function HomePageSkeleton() {
  const limit = config.home.featuredPostsLimit;

  return (
    <div className="fuwari-onload-animation flex flex-col rounded-(--fuwari-radius-large) bg-(--fuwari-card-bg) py-1 md:py-0 md:bg-transparent md:gap-4">
      {Array.from({ length: limit }).map((_, i) => (
        <div key={i} className="fuwari-onload-animation">
          {/* Mock PostCard */}
          <div className="fuwari-card-base flex flex-col w-full rounded-(--fuwari-radius-large) overflow-hidden relative">
            <div className="pl-6 md:pl-9 pr-6 pt-6 md:pt-7 pb-6 relative w-full md:pr-24">
              {/* Title Skeleton */}
              <div className="mb-3 before:hidden md:before:block relative">
                <Skeleton className="h-9 w-3/4 rounded-md" />
              </div>

              {/* Metadata row skeleton */}
              <div className="flex flex-wrap items-center gap-4 gap-x-4 gap-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-24 rounded-md" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                </div>
              </div>

              {/* Description skeleton */}
              <div className="mb-3.5 pr-4 space-y-2">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-5/6 rounded-md md:hidden" />
              </div>

              {/* Read time skeleton */}
              <div className="flex gap-4">
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
            </div>

            {/* Enter button skeleton - hidden on mobile, shown on md */}
            <div className="hidden md:flex fuwari-btn-regular w-13 absolute right-3 top-3 bottom-3 rounded-xl items-center justify-center opacity-50 pointer-events-none">
              <ChevronRight
                className="text-(--fuwari-primary) text-4xl"
                strokeWidth={2}
              />
            </div>
          </div>
          <div className="border-t border-dashed mx-6 border-black/10 dark:border-white/15 last:border-t-0 md:hidden" />
        </div>
      ))}
    </div>
  );
}
