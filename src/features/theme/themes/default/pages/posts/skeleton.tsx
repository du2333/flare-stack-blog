import { INITIAL_TAG_COUNT } from "./page";
import { Skeleton } from "@/components/ui/skeleton";
import { blogConfig } from "@/blog.config";

export function PostsPageSkeleton() {
  return (
    <div className="w-full max-w-3xl mx-auto pb-20 px-6 md:px-0">
      {/* Header Section */}
      <header className="py-12 md:py-20 space-y-6">
        <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-foreground">
          文章
        </h1>
        <p className="max-w-xl text-base md:text-lg font-light text-muted-foreground leading-relaxed">
          {blogConfig.description}
        </p>
      </header>

      {/* Tag Filters Skeleton */}
      <div className="mb-12 space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground/50">
          <span>// 分类_筛选</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {Array.from({ length: INITIAL_TAG_COUNT }).map((_, i) => (
            <div key={i} className="flex items-baseline gap-1.5">
              <Skeleton className="h-4 w-12 bg-muted/60 rounded-none" />
              <Skeleton className="h-3 w-4 bg-muted/40 rounded-none" />
            </div>
          ))}
        </div>
      </div>

      {/* Posts List - Skeleton Items */}
      <div className="flex flex-col gap-0 border-t border-border/40">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="group border-b border-border/40 last:border-0"
          >
            <div className="block py-8 md:py-10">
              <div className="flex flex-col gap-3">
                {/* Metadata Row */}
                <div className="flex items-center gap-3 text-xs font-mono tracking-wider">
                  <Skeleton className="h-3 w-24 bg-muted/60 rounded-none" />
                  <span className="opacity-30">/</span>
                  <div className="flex gap-2">
                    <Skeleton className="h-3 w-16 bg-muted/60 rounded-none" />
                  </div>
                </div>

                {/* Title */}
                <Skeleton className="h-8 md:h-10 w-3/4 bg-muted/80 rounded-none my-1" />

                {/* Summary */}
                <div className="space-y-2 mt-1">
                  <Skeleton className="h-4 w-full bg-muted/40 rounded-none" />
                  <Skeleton className="h-4 w-5/6 bg-muted/40 rounded-none" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading More Skeleton */}
      <div className="py-16 flex flex-col items-center justify-center gap-6 opacity-50">
        <div className="h-px w-24 bg-border/40"></div>
      </div>
    </div>
  );
}
