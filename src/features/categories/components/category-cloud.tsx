import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { categoriesQueryOptions } from "@/features/categories/queries";
import { withCategoryFilter } from "@/features/posts/utils/post-public-search";
import { m } from "@/paraglide/messages";

export function CategoriesSkeleton() {
  return (
    <div className="fuwari-card-base p-4">
      <Skeleton className="h-5 w-20 mb-3" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function Categories() {
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions);

  if (categories.length === 0) return null;

  return (
    <div className="fuwari-card-base pb-4">
      <div className="font-bold text-lg fuwari-text-90 relative ml-6 mt-4 mb-2">
        <span
          className="absolute -left-4 top-[5.5px] w-1 h-4 rounded-md"
          style={{ backgroundColor: "var(--fuwari-primary)" }}
        />
        {m.categories_title()}
      </div>
      <div className="px-4 flex flex-wrap gap-2">
        {categories.map((category) => (
          <Link
            key={category.id}
            to="/posts"
            search={(prev) => withCategoryFilter(prev, category.name)}
            className="fuwari-btn-regular h-8 text-sm px-3 rounded-lg flex items-center gap-2"
          >
            <span>{category.name}</span>
            <span className="bg-black/5 dark:bg-white/10 rounded-md px-1.5 py-0.5 text-xs opacity-70">
              {category.postCount}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
