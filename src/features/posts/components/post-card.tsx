import { ClientOnly, Link } from "@tanstack/react-router";
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  Eye,
  Flame,
  Pin,
  Tag,
} from "lucide-react";
import {
  withCategoryFilter,
  withTagFilter,
} from "@/features/posts/utils/post-public-search";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface PostCardProps {
  post: PostItem;
  pinned?: boolean;
  popular?: boolean;
}

export function PostCard({ post, pinned, popular }: PostCardProps) {
  const tagNames = (post.tags ?? []).map((t) => t.name);
  const hasCover = Boolean(post.cover);
  const coverWidth = "28%";

  return (
    <div
      className={`fuwari-card-base flex flex-col-reverse md:flex-col w-full rounded-(--fuwari-radius-large) overflow-hidden relative ${
        pinned ? "border-2 border-(--fuwari-primary)/20 shadow-sm" : ""
      }`}
      style={{ ["--coverWidth" as string]: coverWidth }}
    >
      {pinned && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-(--fuwari-primary) opacity-5 rounded-bl-[100px] -z-10 pointer-events-none" />
      )}

      <div
        className={`pl-6 md:pl-9 pr-6 md:pr-2 pt-6 md:pt-7 pb-6 relative ${
          hasCover
            ? "w-full md:w-[calc(100%_-_var(--coverWidth)_-_12px)]"
            : "w-full md:w-[calc(100%_-_52px_-_12px)]"
        }`}
      >
        {(pinned || popular) && (
          <div className="flex items-center gap-1.5 font-medium text-sm mb-3">
            {pinned ? (
              <>
                <Pin
                  size={16}
                  className="fill-current text-(--fuwari-primary)"
                />
                <span className="text-(--fuwari-primary)">
                  {m.home_pinned_posts()}
                </span>
              </>
            ) : (
              <>
                <Flame size={16} className="text-orange-500" />
                <span className="text-orange-500">
                  {m.home_popular_posts()}
                </span>
              </>
            )}
          </div>
        )}

        <Link
          to="/post/$slug"
          params={{ slug: post.slug }}
          className="transition group w-full block font-bold mb-3 text-3xl fuwari-text-90 hover:text-(--fuwari-primary) active:text-(--fuwari-primary) relative before:w-1 before:h-5 before:rounded-md before:absolute before:-left-5 before:top-1/2 before:-translate-y-1/2 before:hidden md:before:block before:bg-(--fuwari-primary)"
        >
          {post.title}
          <ChevronRight className="inline-block md:hidden text-[2rem] text-(--fuwari-primary) align-middle -mt-1 ml-1" />
          <ChevronRight className="text-(--fuwari-primary) text-[2rem] transition hidden md:inline absolute translate-y-0.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0" />
        </Link>

        <div className="flex flex-wrap fuwari-text-50 items-center gap-4 gap-x-4 gap-y-2 mb-4">
          <div className="flex items-center">
            <div className="fuwari-meta-icon">
              <Calendar size={20} strokeWidth={1.5} />
            </div>
            <time
              dateTime={post.publishedAt?.toISOString()}
              className="text-sm font-medium"
            >
              <ClientOnly fallback="-">
                {formatDate(post.publishedAt)}
              </ClientOnly>
            </time>
          </div>
          {post.category ? (
            <div className="flex items-center">
              <div className="fuwari-meta-icon">
                <BookOpen size={20} strokeWidth={1.5} />
              </div>
              <Link
                to="/posts"
                search={withCategoryFilter(post.category?.name)}
                className="fuwari-expand-animation rounded-md px-1.5 py-1 -m-1.5 text-sm font-medium hover:text-(--fuwari-primary)"
              >
                {post.category.name}
              </Link>
            </div>
          ) : null}
          {tagNames.length > 0 && (
            <div className="flex items-center">
              <div className="fuwari-meta-icon">
                <Tag size={20} strokeWidth={1.5} />
              </div>
              <div className="flex flex-row flex-wrap items-center gap-x-1.5">
                {tagNames.map((name, i) => (
                  <span key={name} className="flex items-center">
                    {i > 0 && (
                      <span className="mx-1.5 text-(--fuwari-meta-divider) text-sm">
                        /
                      </span>
                    )}
                    <Link
                      to="/posts"
                      search={withTagFilter(name)}
                      className="fuwari-expand-animation rounded-md px-1.5 py-1 -m-1.5 text-sm font-medium hover:text-(--fuwari-primary)"
                    >
                      {name}
                    </Link>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          className={`fuwari-text-75 pr-4 wrap-break-word ${
            pinned
              ? "mb-4 line-clamp-3 md:line-clamp-2 text-lg leading-relaxed"
              : "mb-3.5 line-clamp-2 md:line-clamp-1"
          }`}
        >
          {post.summary ?? ""}
        </div>

        <div className="text-sm fuwari-text-50 flex items-center gap-4 [&_svg]:shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} />
            {m.read_time({ count: post.readTimeInMinutes })}
          </span>
          {post.viewCount !== undefined && (
            <span className="inline-flex items-center gap-1.5">
              <Eye size={14} />
              {m.post_views_count({ count: post.viewCount })}
            </span>
          )}
        </div>
      </div>

      {hasCover && post.cover ? (
        <Link
          to="/post/$slug"
          params={{ slug: post.slug }}
          aria-label={post.title}
          className="group max-h-[20vh] md:max-h-none mx-4 mt-4 -mb-2 md:mb-0 md:mx-0 md:mt-0 md:w-(--coverWidth) relative md:absolute md:top-3 md:bottom-3 md:right-3 rounded-xl overflow-hidden active:scale-95"
        >
          <div className="absolute pointer-events-none z-10 w-full h-full group-hover:bg-black/30 group-active:bg-black/50 transition" />
          <div className="absolute pointer-events-none z-20 w-full h-full flex items-center justify-center">
            <ChevronRight className="transition opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 text-white text-5xl" />
          </div>
          <img
            src={post.cover.url}
            alt={post.title}
            width={post.cover.width ?? undefined}
            height={post.cover.height ?? undefined}
            className="w-full h-full object-cover"
          />
        </Link>
      ) : (
        <Link
          to="/post/$slug"
          params={{ slug: post.slug }}
          aria-label={post.title}
          className="hidden md:flex fuwari-btn-regular w-13 absolute right-3 top-3 bottom-3 rounded-xl active:scale-95"
        >
          <ChevronRight
            className="text-(--fuwari-primary) text-4xl mx-auto"
            strokeWidth={2}
          />
        </Link>
      )}
    </div>
  );
}
