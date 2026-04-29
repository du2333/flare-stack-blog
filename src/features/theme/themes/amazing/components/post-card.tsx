import { ClientOnly, Link } from "@tanstack/react-router";
import {
  Calendar,
  ChevronRight,
  Clock,
  Eye,
  Flame,
  Pin,
  Tag,
} from "lucide-react";
import { useCallback, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface PostCardProps {
  post: PostItem;
  pinned?: boolean;
  popular?: boolean;
  views?: number;
  isLoadingViews?: boolean;
}

/**
 * 3D Glass Tilt Post Card — Amazing Theme
 *
 * Features:
 * - Perspective-based 3D tilt following mouse position (±15°)
 * - Radial gradient highlight pseudo-element tracking mouse
 * - Floating translateZ on hover for depth
 * - Smooth spring-like reset on mouse leave
 * - Pinned/popular badges with glow effect
 */
export function PostCard({
  post,
  pinned,
  popular,
  views,
  isLoadingViews,
}: PostCardProps) {
  const tagNames = (post.tags ?? []).map((t) => t.name);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0~1
    const y = (e.clientY - rect.top) / rect.height; // 0~1

    const rotateX = (y - 0.5) * -30; // ±15°
    const rotateY = (x - 0.5) * 30; // ±15°

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
    card.style.setProperty("--highlight-x", `${x * 100}%`);
    card.style.setProperty("--highlight-y", `${y * 100}%`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform =
      "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
    card.style.setProperty("--highlight-x", "50%");
    card.style.setProperty("--highlight-y", "50%");
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`fuwari-card-base amazing-3d-card flex flex-col w-full rounded-(--fuwari-radius-large) overflow-hidden relative ${
        pinned
          ? "border-2 border-(--fuwari-primary)/20 shadow-md hover:shadow-[0_8px_40px_rgba(var(--amazing-primary-rgb),0.15)]"
          : "hover:shadow-xl"
      }`}
      style={{
        transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s",
      }}
    >
      {pinned && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-(--fuwari-primary) opacity-5 rounded-bl-[100px] -z-10 pointer-events-none" />
      )}

      <div className="pl-6 md:pl-9 pr-6 pt-6 md:pt-7 pb-6 relative w-full md:pr-24">
        {/* Badge */}
        {(pinned || popular) && (
          <div className="flex items-center gap-1.5 font-medium text-sm mb-3">
            {pinned ? (
              <>
                <Pin
                  size={16}
                  className="fill-current text-(--fuwari-primary) animate-pulse"
                />
                <span className="text-(--fuwari-primary)">
                  {m.home_pinned_posts()}
                </span>
              </>
            ) : (
              <>
                <Flame
                  size={16}
                  className="text-orange-500 animate-pulse"
                />
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
          className="transition-all duration-300 group w-full block font-bold mb-3 text-3xl fuwari-text-90 hover:text-(--fuwari-primary) active:text-(--fuwari-primary) relative before:w-1 before:h-5 before:rounded-md before:absolute before:-left-5 before:top-1/2 before:-translate-y-1/2 before:hidden md:before:block before:bg-(--fuwari-primary) before:transition-all before:duration-300 hover:before:h-8 hover:before:bg-(--fuwari-primary-hover)"
        >
          {post.title}
          {
            <>
              <ChevronRight className="inline-block md:hidden text-[2rem] text-(--fuwari-primary) align-middle -mt-1 ml-1" />
              <ChevronRight className="text-(--fuwari-primary) text-[2rem] transition-all duration-300 hidden md:inline absolute translate-y-0.5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0" />
            </>
          }
        </Link>

        {/* Metadata */}
        <div className="flex flex-wrap fuwari-text-50 items-center gap-4 gap-x-4 gap-y-2 mb-4">
          <div className="flex items-center">
            <div className="fuwari-meta-icon">
              <Calendar size={20} strokeWidth={1.5} />
            </div>
            <time
              dateTime={post.publishedAt?.toISOString()}
              className="text-sm font-medium"
            >
              <ClientOnly fallback="-">{formatDate(post.publishedAt)}</ClientOnly>
            </time>
          </div>
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
                      search={{ tagName: name }}
                      className="fuwari-expand-animation rounded-md px-1.5 py-1 -m-1.5 text-sm font-medium hover:text-(--fuwari-primary) transition-colors"
                    >
                      {name}
                    </Link>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div
          className={`fuwari-text-75 pr-4 wrap-break-word ${
            pinned
              ? "mb-4 line-clamp-3 md:line-clamp-2 text-lg leading-relaxed"
              : "mb-3.5 line-clamp-2 md:line-clamp-1"
          }`}
        >
          {post.summary ?? ""}
        </div>

        {/* Read time and Views */}
        <div className="text-sm fuwari-text-50 flex items-center gap-4 [&_svg]:shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} />
            {m.read_time({ count: post.readTimeInMinutes })}
          </span>
          {isLoadingViews ? (
            <span className="inline-flex items-center gap-1.5">
              <Eye size={15} />
              <Skeleton className="h-3.5 w-8 rounded bg-black/10 dark:bg-white/10" />
            </span>
          ) : (
            views !== undefined && (
              <span className="inline-flex items-center gap-1.5">
                <Eye size={15} />
                {views.toLocaleString()}
              </span>
            )
          )}
        </div>
      </div>

      {/* Enter button with hover glow */}
      <Link
        to="/post/$slug"
        params={{ slug: post.slug }}
        aria-label={post.title}
        className="hidden md:flex fuwari-btn-regular w-13 absolute right-3 top-3 bottom-3 rounded-xl active:scale-95 hover:shadow-[0_0_20px_rgba(var(--amazing-primary-rgb),0.2)] transition-all duration-300"
      >
        <ChevronRight
          className="text-(--fuwari-primary) text-4xl mx-auto"
          strokeWidth={2}
        />
      </Link>
    </div>
  );
}
