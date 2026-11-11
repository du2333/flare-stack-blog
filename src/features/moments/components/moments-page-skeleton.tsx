import { Skeleton } from "@/components/ui/skeleton";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";

/** One Moment while it loads, as a card or a row like the Moment itself. */
function MomentCardSkeleton() {
  const row = useThemeRecipe().postCard === "row";
  return (
    <div
      className={
        row
          ? "flex flex-col gap-3"
          : "fuwari-card-base fuwari-card-item flex flex-col gap-3 p-5 md:p-6"
      }
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

export function MomentsPageSkeleton() {
  const rows = useThemeRecipe().postCard === "row";
  return (
    <div className={rows ? "flex flex-col" : "flex flex-col gap-4"}>
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className={
            rows
              ? i > 0
                ? "py-(--theme-row-pad-y) fuwari-list-rule"
                : "py-(--theme-row-pad-y)"
              : undefined
          }
        >
          <MomentCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function MomentPageSkeleton() {
  return <MomentCardSkeleton />;
}
