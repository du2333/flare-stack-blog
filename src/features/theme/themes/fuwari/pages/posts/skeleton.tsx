import { config } from "../../config";
import { Skeleton } from "@/components/ui/skeleton";

export function PostsPageSkeleton() {
  const limit = config.posts.postsPerPage;

  return (
    <div className="fuwari-onload-animation">
      <div className="fuwari-card-base px-8 py-6">
        <div>
          {/* Mock ArchiveYear */}
          <div className="flex flex-row w-full items-center h-15">
            <div className="w-[15%] md:w-[10%] flex justify-end pr-2">
              <Skeleton className="h-6 w-12" />
            </div>
            <div className="w-[15%] md:w-[10%]">
              <div
                className="h-3 w-3 rounded-full outline-(--fuwari-primary) mx-auto
                -outline-offset-2 z-50 outline-3 opacity-50"
              />
            </div>
            <div className="w-[70%] md:w-[80%] flex justify-start pl-2">
              <Skeleton className="h-5 w-20" />
            </div>
          </div>

          {/* Mock ArchivePosts */}
          {Array.from({ length: limit }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-full rounded-lg flex flex-row justify-start items-center"
            >
              {/* Date */}
              <div className="w-[15%] md:w-[10%] flex justify-end pr-2">
                <Skeleton className="h-4 w-10" />
              </div>

              {/* Dot and Line */}
              <div className="w-[15%] md:w-[10%] relative fuwari-timeline-dash h-full flex items-center">
                <div
                  className="mx-auto w-1 h-1 rounded bg-black/50 dark:bg-white/50
                    z-50 outline-4 outline-(--fuwari-card-bg)"
                />
              </div>

              {/* Post Title */}
              <div className="w-[70%] md:max-w-[65%] md:w-[65%] flex justify-start pl-2">
                <Skeleton className="h-5 w-3/4 max-w-50" />
              </div>

              {/* Tag List */}
              <div className="hidden md:flex md:w-[15%] justify-start pl-2">
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
