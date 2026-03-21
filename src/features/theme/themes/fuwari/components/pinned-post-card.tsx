import { Link } from "@tanstack/react-router";
import { Calendar, ChevronRight, Pin, Tag } from "lucide-react";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface PinnedPostCardProps {
  post: PostItem;
}

export function PinnedPostCard({ post }: PinnedPostCardProps) {
  const tagNames = (post.tags ?? []).map((t) => t.name);

  return (
    <div className="fuwari-card-base flex flex-col w-full rounded-(--fuwari-radius-large) overflow-hidden relative border-2 border-(--fuwari-primary)/20 shadow-sm">
      <div className="absolute top-0 right-0 w-32 h-32 bg-(--fuwari-primary) opacity-5 rounded-bl-[100px] -z-10 pointer-events-none" />

      <div className="pl-6 md:pl-9 pr-6 pt-6 md:pt-7 pb-6 relative w-full md:pr-24">
        {/* Pinned Badge */}
        <div className="flex items-center gap-1.5 text-(--fuwari-primary) font-medium text-sm mb-3">
          <Pin size={16} className="fill-current" />
          <span>{m.home_pinned_posts()}</span>
        </div>

        <Link
          to="/post/$slug"
          params={{ slug: post.slug }}
          className="transition group w-full block font-bold mb-4 text-3xl md:text-4xl fuwari-text-90 hover:text-(--fuwari-primary) active:text-(--fuwari-primary)"
        >
          {post.title}
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
              {formatDate(post.publishedAt)}
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

        {/* Description */}
        <div className="fuwari-text-75 mb-4 pr-4 wrap-break-word line-clamp-3 md:line-clamp-2 text-lg leading-relaxed">
          {post.summary ?? ""}
        </div>

        {/* Read time */}
        <div className="text-sm fuwari-text-30 flex gap-4">
          <span>{m.read_time({ count: post.readTimeInMinutes })}</span>
        </div>
      </div>

      {/* Enter button */}
      <Link
        to="/post/$slug"
        params={{ slug: post.slug }}
        aria-label={post.title}
        className="hidden md:flex fuwari-btn-regular w-13 absolute right-4 top-4 bottom-4 rounded-xl active:scale-95 bg-(--fuwari-primary)/5 hover:bg-(--fuwari-primary)/10"
      >
        <ChevronRight
          className="text-(--fuwari-primary) text-4xl mx-auto"
          strokeWidth={2}
        />
      </Link>
    </div>
  );
}
