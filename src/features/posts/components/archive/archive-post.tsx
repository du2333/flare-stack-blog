import { Link } from "@tanstack/react-router";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { formatPublicPostDate } from "@/features/posts/utils/format-public-post-date";

interface ArchivePostProps {
  post: PostItem;
}

export function ArchivePost({ post }: ArchivePostProps) {
  const date = post.publishedAt ? new Date(post.publishedAt) : null;

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
