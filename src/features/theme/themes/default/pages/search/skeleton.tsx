import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function SearchPageSkeleton() {
  return (
    <div className="w-full max-w-3xl mx-auto px-6 md:px-0 py-12 md:py-20">
      <header className="flex items-center justify-between mb-12">
        <button
          disabled
          className="group flex items-center gap-2 text-muted-foreground opacity-50"
        >
          <ArrowLeft size={18} />
          <span className="font-mono text-xs uppercase tracking-widest">
            返回
          </span>
        </button>
      </header>

      <section className="mb-16">
        <div className="relative flex items-center gap-4 border-b border-border/30 pb-4">
          <div className="flex-1">
            <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1 opacity-50">
              搜索文章
            </label>
            <Skeleton className="h-14 md:h-16 w-3/4 bg-muted/40 rounded-none" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="group relative p-4 -mx-4 rounded-lg">
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <Skeleton className="h-6 md:h-7 w-2/3 bg-muted/60 rounded-none" />
              </div>

              <div className="space-y-1">
                <Skeleton className="h-4 w-full bg-muted/40 rounded-none" />
                <Skeleton className="h-4 w-5/6 bg-muted/40 rounded-none" />
              </div>

              <div className="flex gap-2 pt-2">
                <Skeleton className="h-5 w-16 bg-muted/30 rounded-sm" />
                <Skeleton className="h-5 w-20 bg-muted/30 rounded-sm" />
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
