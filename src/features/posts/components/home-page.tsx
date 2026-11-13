import { EmptyState } from "@/components/ui/empty-state";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";
import { m } from "@/paraglide/messages";
import { HomePagination } from "./home-pagination";
import { PostCard } from "./post-card";

export const POPULAR_POSTS_LIMIT = 3;

interface HomePageProps {
  posts: Array<PostItem>;
  popularPosts?: Array<PostItem>;
  page: number;
  totalPages: number;
}

export function HomePage({
  posts,
  popularPosts,
  page,
  totalPages,
}: HomePageProps) {
  const popularSlugs = new Set((popularPosts ?? []).map((post) => post.slug));
  // Cards stand apart from md up and join into one surface on phones; rows
  // sit on the page with a rule between them at every width; tiles are a
  // grid, two abreast where the list itself is wide enough (styles.css).
  const form = useThemeRecipe().postCard;
  const rows = form === "row";
  const tiles = form === "tile";
  // A grid of no tiles would leave the page numbers alone on the page.
  if (tiles && posts.length === 0) {
    return (
      <EmptyState
        size="compact"
        className="fuwari-onload-animation fuwari-card-base fuwari-card-panel w-full py-12"
        style={{ animationDelay: "var(--fuwari-content-delay)" }}
        description={m.posts_no_posts()}
      />
    );
  }
  return (
    <div
      className={
        tiles ? "@container flex flex-col gap-6" : "flex flex-col gap-4"
      }
    >
      <div
        className={
          tiles
            ? "fuwari-tile-grid"
            : rows
              ? "flex flex-col"
              : "flex flex-col rounded-(--theme-card-radius) bg-(--theme-surface) py-1 md:py-0 md:bg-transparent md:gap-4"
        }
      >
        {posts.map((post, i) => (
          <div
            key={post.slug}
            className={
              tiles
                ? "fuwari-onload-animation fuwari-tile-cell"
                : rows && i > 0
                  ? "fuwari-onload-animation py-(--theme-row-pad-y) fuwari-list-rule"
                  : "fuwari-onload-animation py-(--theme-row-pad-y)"
            }
            style={{
              animationDelay: `calc(var(--fuwari-content-delay) + ${i * 50}ms)`,
            }}
          >
            <PostCard
              post={post}
              index={i}
              pinned={Boolean(post.pinnedAt)}
              popular={!post.pinnedAt && popularSlugs.has(post.slug)}
            />
            {form === "card" && i < posts.length - 1 && (
              <div className="border-t border-dashed mx-6 border-(--theme-rule,var(--fuwari-divider)) md:hidden" />
            )}
          </div>
        ))}
      </div>
      <HomePagination page={page} totalPages={totalPages} />
    </div>
  );
}
