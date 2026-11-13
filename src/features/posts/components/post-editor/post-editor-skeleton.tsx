import { Skeleton } from "@/components/ui/skeleton";
import "./post-editor.css";

/**
 * The editor before its Post arrives: the header, then the title, the chips
 * and a few lines of text in the page's column, at the sizes the page has.
 */
export function PostEditorSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <section className="post-editor-workspace overflow-hidden" aria-busy>
        <header className="post-editor-header">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-28" />
          <div className="post-editor-header-actions">
            <Skeleton className="h-8.5 w-20 rounded-[10px]" />
          </div>
        </header>
        <div className="post-editor-body">
          <div className="post-editor-document">
            <Skeleton className="mb-4 h-11 w-3/4" />
            <div className="mb-9 flex gap-1.5">
              <Skeleton className="h-6.5 w-20 rounded-full" />
              <Skeleton className="h-6.5 w-16 rounded-full" />
              <Skeleton className="h-6.5 w-16 rounded-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="mt-8 h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
