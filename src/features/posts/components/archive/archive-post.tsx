import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { plateCharacter } from "@/features/posts/components/post-card";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { formatPublicPostDate } from "@/features/posts/utils/format-public-post-date";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";

interface ArchivePostProps {
  post: PostItem;
}

export function ArchivePost({ post }: ArchivePostProps) {
  const date = post.publishedAt ? new Date(post.publishedAt) : null;
  const archive = useThemeRecipe().archive;

  // A row led by its cover: the title over one line with the date and the
  // Tags. The cover loads as its row comes near the window.
  if (archive === "covers") {
    return (
      <Link
        to="/post/$slug"
        params={{ slug: post.slug }}
        className="fuwari-archive-cover-row group"
        aria-label={post.title}
      >
        <span
          className="fuwari-archive-cover"
          data-lead={post.cover ? "cover" : "plate"}
          aria-hidden="true"
        >
          {post.cover ? (
            <img
              src={getPublicImageSrc(
                post.cover.url,
                PUBLIC_IMAGE_WIDTH.rowCover,
              )}
              alt=""
              loading="lazy"
            />
          ) : (
            <span>{plateCharacter(post.title)}</span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold fuwari-text-90 transition-colors group-hover:text-(--theme-accent)">
            {post.title}
          </span>
          <span className="mt-1 flex min-w-0 items-baseline gap-2 text-sm fuwari-text-50">
            <time
              dateTime={date?.toISOString()}
              className="shrink-0 tabular-nums"
            >
              {formatPublicPostDate(date, { monthDay: true })}
            </time>
            {post.tags?.length ? (
              <span className="min-w-0 truncate fuwari-text-30">
                {post.tags.map((t) => `#${t.name}`).join(" ")}
              </span>
            ) : null}
          </span>
        </span>
      </Link>
    );
  }

  // An index entry: the date, the title and the Tags under a rule.
  if (archive === "index") {
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
      className="group block! h-10 w-full rounded-lg hover:bg-(--theme-plain-bg-hover) active:bg-(--theme-plain-bg-active) transition-colors"
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
              bg-(--fuwari-fg-faint) group-hover:bg-(--theme-accent)
              outline z-50
              outline-(--theme-surface)
              group-hover:outline-(--theme-plain-bg-hover)
              group-active:outline-(--theme-plain-bg-active)"
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
  const archive = useThemeRecipe().archive;
  if (archive === "covers") {
    return (
      <div className="fuwari-archive-cover-row">
        <Skeleton className="fuwari-archive-cover" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-5 w-3/4 max-w-80" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
      </div>
    );
  }
  if (archive === "index") {
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
      <div className="w-[15%] md:w-[10%] relative h-full flex items-center before:absolute before:w-1 left-1/2 -ml-0.5 pointer-events-none before:border-l-2 before:border-dashed before:border-(--theme-rule,var(--fuwari-hairline)) before:-top-5 before:bottom-0 before:h-20 z-0">
        <div className="mx-auto w-2 h-2 rounded-full bg-(--theme-rule,var(--fuwari-meta-divider)) z-10" />
      </div>
      <div className="w-[70%] md:max-w-[65%] md:w-[65%] flex justify-start pl-2">
        <Skeleton className="h-5 w-3/4 max-w-50" />
      </div>
    </div>
  );
}
