import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ExpandableSidebarCard } from "@/components/layout/expandable-sidebar-card";
import { Skeleton } from "@/components/ui/skeleton";
import { categoriesQueryOptions } from "@/features/categories/queries";
import { withCategoryFilter } from "@/features/posts/utils/post-public-search";
import { m } from "@/paraglide/messages";

/** From this many categories the narrow form cuts the list short. */
const COLLAPSE_THRESHOLD = 5;

/** The card while its categories load, in both of its forms. */
export function CategoriesSkeleton() {
  return (
    <div className="fuwari-card-base fuwari-card-widget pb-4 @xs/card:grid @xs/card:gap-x-4 @xs/card:gap-y-2 @xs/card:px-(--theme-widget-pad-x,1.25rem) @xs/card:py-3.5 @[34rem]/card:grid-cols-[auto_minmax(0,1fr)]">
      <Skeleton className="h-5 w-20 ml-(--theme-widget-pad-x,1.5rem) mt-4 mb-2 @xs/card:mx-0 @xs/card:my-1.5 @xs/card:w-10" />
      <div className="px-(--theme-widget-pad-x,1rem) @xs/card:flex @xs/card:gap-2 @xs/card:overflow-hidden @xs/card:px-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-10 w-full rounded-lg @xs/card:h-8 @xs/card:w-20 @xs/card:shrink-0 @xs/card:rounded-(--theme-chip-radius)"
          />
        ))}
      </div>
    </div>
  );
}

export function Categories() {
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions);
  const [expanded, setExpanded] = useState(false);

  if (categories.length === 0) return null;

  return (
    <ExpandableSidebarCard
      title={m.categories_title()}
      long={categories.length >= COLLAPSE_THRESHOLD}
      expanded={expanded}
      onExpand={() => setExpanded(true)}
    >
      {categories.map((category) => (
        // A row with its count at the far end; in the wide form a pill with
        // the count inside, as a tag is a pill.
        <Link
          key={category.id}
          to="/posts"
          search={withCategoryFilter(category.name)}
          className="fuwari-widget-row flex items-center h-10 rounded-lg pl-2 hover:pl-3 hover:bg-(--theme-plain-bg-hover) active:bg-(--theme-plain-bg-active) transition-all text-(--theme-widget-row-color) hover:text-(--theme-accent) @xs/card:mx-0 @xs/card:h-8 @xs/card:w-auto @xs/card:max-w-full @xs/card:rounded-(--theme-chip-radius) @xs/card:bg-(--theme-chip-bg,var(--theme-tonal-bg)) @xs/card:shadow-[inset_0_0_0_1px_var(--theme-chip-edge,transparent)] @xs/card:pl-3 @xs/card:pr-1 @xs/card:text-sm @xs/card:text-(--theme-tonal-fg) @xs/card:hover:bg-(--theme-tonal-bg-hover) @xs/card:hover:text-(--theme-tonal-fg) @xs/card:active:bg-(--theme-tonal-bg-active) dark:@xs/card:text-(--fuwari-fg-75) dark:@xs/card:hover:text-(--fuwari-fg-75)"
        >
          <div className="flex items-center justify-between relative mr-2 w-full min-w-0 @xs/card:mr-0 @xs/card:gap-2">
            <div className="overflow-hidden text-left whitespace-nowrap text-ellipsis">
              {category.name}
            </div>
            <div className="transition px-2 h-7 ml-4 min-w-8 rounded-(--theme-chip-radius) text-sm font-bold text-(--theme-count-fg,var(--theme-tonal-fg)) dark:text-(--theme-count-fg,var(--theme-solid-fg,var(--fuwari-deep-text))) bg-(--theme-count-bg,var(--theme-tonal-bg)) dark:bg-(--theme-count-bg,var(--theme-solid-bg)) flex items-center justify-center @xs/card:ml-0 @xs/card:h-6 @xs/card:min-w-6 @xs/card:px-1.5 @xs/card:text-xs @xs/card:bg-(--theme-chip-count-bg,var(--theme-surface)) dark:@xs/card:bg-(--theme-chip-count-bg,var(--theme-surface)) dark:@xs/card:text-(--fuwari-fg-75)">
              {category.postCount}
            </div>
          </div>
        </Link>
      ))}
    </ExpandableSidebarCard>
  );
}
