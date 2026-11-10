import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ExpandableSidebarCard } from "@/components/layout/expandable-sidebar-card";
import { Skeleton } from "@/components/ui/skeleton";
import { categoriesQueryOptions } from "@/features/categories/queries";
import { withCategoryFilter } from "@/features/posts/utils/post-public-search";
import { m } from "@/paraglide/messages";

const COLLAPSE_THRESHOLD = 5;

export function CategoriesSkeleton() {
  return (
    <div className="fuwari-card-base fuwari-card-widget pb-4">
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
    <ExpandableSidebarCard
      title={m.categories_title()}
      collapsed={collapsed}
      onExpand={() => setExpanded(true)}
    >
      {categories.map((category) => (
        <Link
          key={category.id}
          to="/posts"
          search={withCategoryFilter(category.name)}
          className="fuwari-widget-row flex items-center h-10 rounded-lg pl-2 hover:pl-3 hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) transition-all text-(--theme-widget-row-color) hover:text-(--theme-accent)"
        >
          <div className="flex items-center justify-between relative mr-2 w-full min-w-0">
            <div className="overflow-hidden text-left whitespace-nowrap text-ellipsis">
              {category.name}
            </div>
            <div className="transition px-2 h-7 ml-4 min-w-8 rounded-(--theme-chip-radius) text-sm font-bold text-(--fuwari-btn-content) dark:text-(--theme-solid-fg,var(--fuwari-deep-text)) bg-(--fuwari-btn-regular-bg) dark:bg-(--theme-solid-bg) flex items-center justify-center">
              {category.postCount}
            </div>
          </div>
        </Link>
      ))}
    </ExpandableSidebarCard>
  );
}
