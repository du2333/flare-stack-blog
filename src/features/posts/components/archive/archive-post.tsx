import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { formatPublicPostDate } from "@/features/posts/utils/format-public-post-date";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";

interface ArchivePostProps {
  post: PostItem;
}

export function ArchivePost({ post }: ArchivePostProps) {
  const date = post.publishedAt ? new Date(post.publishedAt) : null;

  // An index entry: the date, the title and the Tags under a rule.
  if (useThemeRecipe().archive === "index") {
    return (
      <Link
        to="/post/$slug"
        params={{ slug: post.slug }}
        className="group flex items-baseline gap-4 md:gap-6 py-2.5 fuwari-list-rule"
        aria-label={post.title}
      >
        <time
          dateTime={date?.toISOString()}
          className="w-12 shrink-0 text-sm tabular-nums fuwari-text-50"
        >
          {formatPublicPostDate(date, { monthDay: true })}
        </time>
        <span className="min-w-0 flex-1 truncate font-bold fuwari-text-75 transition-colors group-hover:text-(--theme-accent)">
          {post.title}
        </span>
        {post.tags?.length ? (
          <span className="hidden md:block max-w-[30%] shrink-0 truncate text-sm fuwari-text-30">
            {post.tags.map((t) => `#${t.name}`).join(" ")}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      to="/post/$slug"
      params={{ slug: post.slug }}
      className="group block! h-10 w-full rounded-lg hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) transition-colors"
      aria-label={post.title}
    >
      <div className="flex flex-row justify-start items-center h-full">
        {/* Date */}
        <div className="w-[15%] md:w-[10%] transition text-sm text-right fuwari-text-50">
          <time dateTime={date?.toISOString()}>
            {formatPublicPostDate(date, { monthDay: true })}
          </time>
        </div>

        {/* Dot and Line */}
        <div className="w-[15%] md:w-[10%] relative fuwari-timeline-dash h-full flex items-center">
          <div
            className="transition-all mx-auto w-1 h-1 rounded group-hover:h-5
              bg-black/50 dark:bg-white/50 group-hover:bg-(--theme-accent)
              outline z-50
              outline-(--theme-surface)
              group-hover:outline-(--fuwari-btn-plain-bg-hover)
              group-active:outline-(--fuwari-btn-plain-bg-active)"
          />
        </div>

        {/* Post Title */}
        <div
          className="w-[70%] md:max-w-[65%] md:w-[65%] text-left font-bold
            group-hover:translate-x-1 transition-all group-hover:text-(--theme-accent)
            fuwari-text-75 pr-8 whitespace-nowrap overflow-ellipsis overflow-hidden"
        >
          {post.title}
        </div>

        {/* Tag List */}
        <div className="hidden md:block md:w-[15%] text-left text-sm transition whitespace-nowrap overflow-ellipsis overflow-hidden fuwari-text-30">
          {post.tags?.map((t) => `#${t.name}`).join(" ")}
        </div>
      </div>
    </Link>
  );
}

/** An entry while the next page of the archive loads, in the same form. */
export function ArchivePostSkeleton() {
  if (useThemeRecipe().archive === "index") {
    return (
      <div className="flex items-center gap-4 md:gap-6 py-3 fuwari-list-rule">
        <Skeleton className="h-4 w-12 shrink-0" />
        <Skeleton className="h-5 w-3/4 max-w-80" />
      </div>
    );
  }

  return (
    <div className="h-10 w-full rounded-lg flex flex-row justify-start items-center">
      <div className="w-[15%] md:w-[10%] flex justify-end pr-2">
        <Skeleton className="h-4 w-10" />
      </div>
      <div className="w-[15%] md:w-[10%] relative h-full flex items-center before:absolute before:w-1 left-1/2 -ml-0.5 pointer-events-none before:border-l-2 before:border-dashed before:border-black/5 dark:before:border-white/5 before:-top-5 before:bottom-0 before:h-20 z-0">
        <div className="mx-auto w-2 h-2 rounded-full bg-black/20 dark:bg-white/20 z-10" />
      </div>
      <div className="w-[70%] md:max-w-[65%] md:w-[65%] flex justify-start pl-2">
        <Skeleton className="h-5 w-3/4 max-w-50" />
      </div>
    </div>
  );
}
