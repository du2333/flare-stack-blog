import { Link } from "@tanstack/react-router";
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
  getPublicImageSrc,
  getPublicImageSrcSet,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import {
  withCategoryFilter,
  withTagFilter,
} from "@/features/posts/utils/post-public-search";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { formatPublicPostDate } from "@/features/posts/utils/format-public-post-date";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { MetaItem } from "./post-meta";

interface PostCardProps {
  post: PostItem;
  pinned?: boolean;
  popular?: boolean;
}

/** A Post in the home list, as a card or a row (Theme Recipe). */
export function PostCard(props: PostCardProps) {
  return useThemeRecipe().postCard === "row" ? (
    <PostRow {...props} />
  ) : (
    <PostCardBox {...props} />
  );
}

function PostKicker({ pinned }: { pinned?: boolean }) {
  return (
    <div
      className="fuwari-kicker flex items-center gap-1.5 font-medium mb-3"
      data-kind={pinned ? "pinned" : "popular"}
    >
      {pinned ? (
        <>
          <Pin size={16} className="fill-current" />
          <span>{m.home_pinned_posts()}</span>
        </>
      ) : (
        <>
          <Flame size={16} />
          <span>{m.home_popular_posts()}</span>
        </>
      )}
    </div>
  );
}

/** The date, Category and Tags; the Tags only from the md width up. */
function PostListMeta({ post }: { post: PostItem }) {
  const inlineMeta = useThemeRecipe().meta === "inline";
  const tagNames = (post.tags ?? []).map((t) => t.name);
  // Plain text drops the hover pad, which would run into the dot before it.
  const linkClass = inlineMeta
    ? "fuwari-meta-text transition hover:text-(--theme-accent)"
    : "fuwari-expand-animation fuwari-meta-text rounded-md px-1.5 py-1 -m-1.5 hover:text-(--theme-accent)";

  return (
    <>
      <MetaItem icon={Calendar}>
        <time
          dateTime={post.publishedAt?.toISOString()}
          className="fuwari-meta-text"
        >
          {formatPublicPostDate(post.publishedAt)}
        </time>
      </MetaItem>
      {post.category ? (
        <MetaItem icon={BookOpen}>
          <Link
            to="/posts"
            search={withCategoryFilter(post.category?.name)}
            className={linkClass}
          >
            {post.category.name}
          </Link>
        </MetaItem>
      ) : null}
      {tagNames.length > 0 && (
        <MetaItem icon={Tag} className="hidden md:flex items-center">
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
                  className={linkClass}
                >
                  {name}
                </Link>
              </span>
            ))}
          </div>
        </MetaItem>
      )}
    </>
  );
}

function PostCardBox({ post, pinned, popular }: PostCardProps) {
  const recipe = useThemeRecipe();
  const hasCover = Boolean(post.cover);
  const strip = !hasCover && recipe.noCoverStrip === "keep";
  const coverWidth = "28%";
  const inlineMeta = recipe.meta === "inline";

  return (
    <div
      className="fuwari-card-base fuwari-card-item flex flex-col-reverse md:flex-col w-full overflow-hidden relative"
      style={{ ["--coverWidth" as string]: coverWidth }}
    >
      <div
        className={`pl-6 md:pl-9 pr-6 ${hasCover || strip ? "md:pr-2" : "md:pr-9"} pt-6 md:pt-7 pb-6 relative ${
          hasCover
            ? "w-full md:w-[calc(100%_-_var(--coverWidth)_-_12px)]"
            : strip
              ? "w-full md:w-[calc(100%_-_52px_-_12px)]"
              : "w-full"
        }`}
      >
        {(pinned || popular) && <PostKicker pinned={pinned} />}

        <Link
          to="/post/$slug"
          params={{ slug: post.slug }}
          className={cn(
            "fuwari-heading fuwari-list-title transition group w-full block font-bold mb-3 fuwari-text-90 hover:text-(--theme-accent) active:text-(--theme-accent) relative",
            recipe.headingAccent === "on" &&
              "before:w-1 before:h-5 before:rounded-md before:absolute before:-left-5 before:top-1/2 before:-translate-y-1/2 before:hidden md:before:block before:bg-(--theme-accent)",
          )}
        >
          {post.title}
          <ChevronRight className="inline-block md:hidden text-[2rem] text-(--theme-accent) align-middle -mt-1 ml-1" />
          <ChevronRight className="text-(--theme-accent) text-[2rem] transition hidden md:inline absolute translate-y-0.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0" />
        </Link>

        <div
          className={
            inlineMeta
              ? "flex flex-wrap fuwari-text-50 items-center gap-x-2 gap-y-1 mb-3 fuwari-meta-inline"
              : "flex flex-wrap fuwari-text-50 items-center gap-4 gap-x-4 gap-y-2 mb-4"
          }
        >
          <PostListMeta post={post} />
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

        <div
          className={
            inlineMeta
              ? "text-sm fuwari-text-50 flex items-center gap-2 fuwari-meta-inline"
              : "text-sm fuwari-text-50 flex items-center gap-4 [&_svg]:shrink-0"
          }
        >
          <span className="inline-flex items-center gap-1.5">
            {inlineMeta ? null : <Clock size={14} />}
            {m.read_time({ count: post.readTimeInMinutes })}
          </span>
          {post.viewCount !== undefined && (
            <span className="inline-flex items-center gap-1.5">
              {inlineMeta ? null : <Eye size={14} />}
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
          className="group max-h-[20vh] md:max-h-none mx-4 mt-4 -mb-2 md:mb-0 md:mx-0 md:mt-0 md:w-(--coverWidth) relative md:absolute md:top-3 md:bottom-3 md:right-3 rounded-(--theme-cover-radius) overflow-hidden active:scale-95"
        >
          <div className="absolute pointer-events-none z-10 w-full h-full group-hover:bg-black/30 group-active:bg-black/50 transition" />
          <div className="absolute pointer-events-none z-20 w-full h-full flex items-center justify-center">
            <ChevronRight className="transition opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 text-white text-5xl" />
          </div>
          <img
            src={getPublicImageSrc(post.cover.url, PUBLIC_IMAGE_WIDTH.cover)}
            srcSet={getPublicImageSrcSet(post.cover.url, [
              PUBLIC_IMAGE_WIDTH.cover,
              PUBLIC_IMAGE_WIDTH.cover * 2,
            ])}
            sizes="(min-width: 768px) 28vw, 100vw"
            alt={post.title}
            width={post.cover.width ?? undefined}
            height={post.cover.height ?? undefined}
            className="w-full h-full object-cover"
          />
        </Link>
      ) : strip ? (
        <Link
          to="/post/$slug"
          params={{ slug: post.slug }}
          aria-label={post.title}
          className="hidden md:flex fuwari-btn-regular w-13 absolute right-3 top-3 bottom-3 rounded-xl active:scale-95"
        >
          <ChevronRight
            className="text-(--theme-accent) text-4xl mx-auto"
            strokeWidth={2}
          />
        </Link>
      ) : null}
    </div>
  );
}

/**
 * A flat row: the title, the summary when there is one, then the whole meta
 * on one line, with a small cover on the right. The home list draws the
 * rules between rows.
 */
function PostRow({ post, pinned, popular }: PostCardProps) {
  const recipe = useThemeRecipe();
  const inlineMeta = recipe.meta === "inline";

  return (
    <div className="relative flex w-full items-start gap-4 md:gap-6">
      <div className="min-w-0 flex-1">
        {(pinned || popular) && <PostKicker pinned={pinned} />}

        <Link
          to="/post/$slug"
          params={{ slug: post.slug }}
          className={cn(
            "fuwari-heading fuwari-list-title relative block font-bold mb-2 fuwari-text-90 transition hover:text-(--theme-accent) active:text-(--theme-accent)",
            // A row has no side padding, so the bar sits closer than on a card.
            recipe.headingAccent === "on" &&
              "before:w-1 before:h-5 before:rounded-md before:absolute before:-left-3 before:top-1/2 before:-translate-y-1/2 before:hidden md:before:block before:bg-(--theme-accent)",
          )}
        >
          {post.title}
        </Link>

        {post.summary ? (
          <p
            className={`fuwari-text-75 wrap-break-word mb-3 ${
              pinned
                ? "line-clamp-3 md:line-clamp-2 text-lg leading-relaxed"
                : "line-clamp-2"
            }`}
          >
            {post.summary}
          </p>
        ) : null}

        <div
          className={
            inlineMeta
              ? "flex flex-wrap fuwari-text-50 items-center gap-x-2 gap-y-1 fuwari-meta-inline"
              : "flex flex-wrap fuwari-text-50 items-center gap-x-4 gap-y-2"
          }
        >
          <PostListMeta post={post} />
          <MetaItem icon={Clock}>
            <span className="fuwari-meta-text">
              {m.read_time({ count: post.readTimeInMinutes })}
            </span>
          </MetaItem>
          {post.viewCount !== undefined && (
            <MetaItem icon={Eye}>
              <span className="fuwari-meta-text">
                {m.post_views_count({ count: post.viewCount })}
              </span>
            </MetaItem>
          )}
        </div>
      </div>

      {post.cover ? (
        <Link
          to="/post/$slug"
          params={{ slug: post.slug }}
          aria-label={post.title}
          className="block w-24 sm:w-32 md:w-44 aspect-4/3 shrink-0 overflow-hidden rounded-(--theme-cover-radius) transition active:scale-95"
        >
          <img
            src={getPublicImageSrc(post.cover.url, PUBLIC_IMAGE_WIDTH.cover)}
            alt={post.title}
            width={post.cover.width ?? undefined}
            height={post.cover.height ?? undefined}
            className="size-full object-cover"
          />
        </Link>
      ) : null}
    </div>
  );
}
