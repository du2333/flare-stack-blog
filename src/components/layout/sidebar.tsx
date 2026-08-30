import { Suspense } from "react";
import {
  Categories,
  CategoriesSkeleton,
} from "@/features/categories/components/category-cloud";
import { Tags, TagsSkeleton } from "@/features/tags/components/tag-cloud";
import { cn } from "@/lib/utils";
import { Profile } from "./profile";

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside className={cn("flex flex-col gap-4", className)}>
      <div
        className="fuwari-onload-animation"
        style={{ animationDelay: "100ms" }}
      >
        <Profile />
      </div>
      <div
        className="sticky top-4 fuwari-onload-animation"
        style={{ animationDelay: "150ms" }}
      >
        <div className="flex flex-col gap-4">
          <Suspense fallback={<CategoriesSkeleton />}>
            <Categories />
          </Suspense>
          <Suspense fallback={<TagsSkeleton />}>
            <Tags />
          </Suspense>
        </div>
      </div>
    </aside>
  );
}
