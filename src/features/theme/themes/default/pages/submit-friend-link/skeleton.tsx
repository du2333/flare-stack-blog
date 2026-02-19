import { Skeleton } from "@/components/ui/skeleton";

export function SubmitFriendLinkPageSkeleton() {
  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-6 md:px-0 py-12 md:py-20 space-y-20">
      <header className="space-y-8">
        <div className="flex justify-between items-start">
          <div className="space-y-6">
            <Skeleton className="h-12 md:h-14 w-48 bg-muted/60 rounded-none" />
            <div className="space-y-2 max-w-2xl">
              <Skeleton className="h-5 w-80 bg-muted/40 rounded-none" />
            </div>
          </div>

          <div className="pt-2">
            <Skeleton className="h-5 w-24 bg-muted/40 rounded-none" />
          </div>
        </div>
      </header>

      <div className="w-full h-px bg-border/40" />

      <section className="space-y-8">
        <Skeleton className="h-7 w-24 bg-muted/60 rounded-none" />
        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20 bg-muted/30 rounded-none" />
              <Skeleton className="h-10 w-full bg-muted/40 rounded-none" />
            </div>
          ))}
        </div>
        <Skeleton className="h-5 w-28 bg-muted/30 rounded-none" />
      </section>

      <div className="w-full h-px bg-border/40" />

      <section className="space-y-8">
        <Skeleton className="h-7 w-24 bg-muted/60 rounded-none" />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start justify-between py-4 border-b border-border/30"
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-32 bg-muted/60 rounded-none" />
                  <Skeleton className="h-4 w-12 bg-muted/40 rounded-none" />
                </div>
                <Skeleton className="h-3 w-48 bg-muted/30 rounded-none" />
              </div>
              <Skeleton className="h-3 w-20 bg-muted/30 rounded-none" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
