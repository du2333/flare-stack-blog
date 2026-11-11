import { Skeleton } from "@/components/ui/skeleton";
import { HOME_POSTS_PER_PAGE } from "@/features/posts/schema/posts.schema";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";

/**
 * One tile while it loads, with the boxes of a tile (post-card.tsx): a lead
 * in the shape of a cover, then a line of title, two of summary and the meta
 * line, each as tall as the text it stands for.
 */
function TileSkeleton() {
  return (
    <div className="fuwari-card-item fuwari-tile overflow-hidden">
      <Skeleton className="fuwari-tile-lead rounded-none" data-lead="cover" />
      <div className="flex min-w-0 flex-col px-5 pt-4 pb-5">
        <div className="fuwari-list-title mb-2 flex h-[1lh] items-center">
          <Skeleton className="h-[0.8em] w-3/5" />
        </div>
        <div className="mb-3 flex h-[2lh] flex-col justify-around text-[0.9375rem] leading-relaxed">
          <Skeleton className="h-[0.8em] w-full" />
          <Skeleton className="h-[0.8em] w-2/3" />
        </div>
        <div className="mt-auto pt-1">
          <div className="flex h-[1lh] items-center">
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * A full page of tiles and the page numbers under it. It ignores the pointer,
 * so a placeholder does not rise like a tile.
 */
function TileListSkeleton() {
  return (
    <div className="@container pointer-events-none flex flex-col gap-6">
      <div className="fuwari-tile-grid">
        {Array.from({ length: HOME_POSTS_PER_PAGE }, (_, i) => (
          <div key={i} className="fuwari-tile-cell">
            <TileSkeleton />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <Skeleton className="h-11 w-9 rounded-(--theme-pager-radius) sm:w-11" />
        <Skeleton className="h-11 w-23 rounded-(--theme-pager-radius) sm:w-55" />
        <Skeleton className="h-11 w-9 rounded-(--theme-pager-radius) sm:w-11" />
      </div>
    </div>
  );
}

/**
 * The home list while it loads. Only the tiles have a skeleton: a grid holds
 * its place, so what follows the list does not move up and back. Cards and
 * rows show nothing, as before.
 */
export function HomePageSkeleton() {
  return useThemeRecipe().postCard === "tile" ? <TileListSkeleton /> : null;
}
