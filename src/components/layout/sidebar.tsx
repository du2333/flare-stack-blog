import { Suspense } from "react";
import {
  Categories,
  CategoriesSkeleton,
} from "@/features/categories/components/category-cloud";
import { LatestMoments } from "@/features/moments/components/latest-moments";
import { Tags, TagsSkeleton } from "@/features/tags/components/tag-cloud";
import { cn } from "@/lib/utils";
import { Profile } from "./profile";

export function Sidebar({
  className,
  showLatestMoments = false,
}: {
  className?: string;
  /** The home page's card of the latest Moments. */
  showLatestMoments?: boolean;
}) {
  return (
    <aside className={cn("flex flex-col gap-4", className)}>
      <div
        className="fuwari-onload-animation"
        style={{ animationDelay: "100ms" }}
      >
        <Profile />
      </div>
      {showLatestMoments ? (
        <div
          className="fuwari-onload-animation"
          style={{ animationDelay: "125ms" }}
        >
          <Suspense fallback={null}>
            <LatestMoments />
          </Suspense>
        </div>
      ) : null}
      <div className="sticky top-4 flex flex-col gap-4">
        <div
          className="fuwari-onload-animation"
          style={{ animationDelay: "150ms" }}
        >
          <Suspense fallback={<CategoriesSkeleton />}>
            <Categories />
          </Suspense>
        </div>
        <div
          className="fuwari-onload-animation"
          style={{ animationDelay: "200ms" }}
        >
          <Suspense fallback={<TagsSkeleton />}>
            <Tags />
          </Suspense>
        </div>
      </div>
    </aside>
  );
}
