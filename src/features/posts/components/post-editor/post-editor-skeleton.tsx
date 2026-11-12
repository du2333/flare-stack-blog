import { Skeleton } from "@/components/ui/skeleton";
export function PostEditorSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden p-5 md:p-8">
        <div className="mb-6 flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-16 rounded-xl" />
        </div>
        <Skeleton className="mb-6 h-8 w-2/3" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </section>
    </div>
  );
}
