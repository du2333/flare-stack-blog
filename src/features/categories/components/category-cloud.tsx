import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Ellipsis } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { categoriesQueryOptions } from "@/features/categories/queries";
import { withCategoryFilter } from "@/features/posts/utils/post-public-search";
import { m } from "@/paraglide/messages";

const COLLAPSED_HEIGHT = "7.5rem";
const COLLAPSE_THRESHOLD = 5;

export function CategoriesSkeleton() {
  return (
    <div className="fuwari-card-base pb-4">
      <Skeleton className="h-5 w-20 ml-6 mt-4 mb-2" />
      <div className="px-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function Categories() {
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions);
  const [expanded, setExpanded] = useState(false);

  if (categories.length === 0) return null;

  const collapsed = categories.length >= COLLAPSE_THRESHOLD && !expanded;

  return (
    <div className="fuwari-card-base pb-4">
      <div className="font-bold text-lg fuwari-text-90 relative ml-6 mt-4 mb-2">
        <span
          className="absolute -left-4 top-[5.5px] w-1 h-4 rounded-md"
          style={{ backgroundColor: "var(--fuwari-primary)" }}
        />
        {m.categories_title()}
      </div>
      <div
        className="px-4 overflow-hidden"
        style={collapsed ? { height: COLLAPSED_HEIGHT } : undefined}
      >
        {categories.map((category) => (
          <Link
            key={category.id}
            to="/posts"
            search={withCategoryFilter(category.name)}
            className="flex items-center w-full h-10 rounded-lg pl-2 hover:pl-3 hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) transition-all text-neutral-700 hover:text-(--fuwari-primary) dark:text-neutral-300 dark:hover:text-(--fuwari-primary)"
          >
            <div className="flex items-center justify-between relative mr-2 w-full min-w-0">
              <div className="overflow-hidden text-left whitespace-nowrap text-ellipsis">
                {category.name}
              </div>
              <div className="transition px-2 h-7 ml-4 min-w-8 rounded-lg text-sm font-bold text-(--fuwari-btn-content) dark:text-(--fuwari-deep-text) bg-(--fuwari-btn-regular-bg) dark:bg-(--fuwari-primary) flex items-center justify-center">
                {category.postCount}
              </div>
            </div>
          </Link>
        ))}
      </div>
      {collapsed && (
        <div className="px-4 -mb-2">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-lg w-full h-9 flex items-center justify-center text-black/75 hover:text-(--fuwari-primary) dark:text-white/75 dark:hover:text-(--fuwari-primary) hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) transition"
          >
            <span className="text-(--fuwari-primary) flex items-center justify-center gap-2 -translate-x-2">
              <Ellipsis size={28} />
              {m.widget_more()}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
