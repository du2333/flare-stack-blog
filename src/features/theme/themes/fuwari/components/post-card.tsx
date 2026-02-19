import { Link } from "@tanstack/react-router";
import { Calendar, ChevronRight, Tag } from "lucide-react";
import type { PostItem } from "@/features/posts/posts.schema";
import { formatDate } from "@/lib/utils";

interface PostCardProps {
  post: PostItem;
}

export function PostCard({ post }: PostCardProps) {
  const tagNames = (post.tags ?? []).map((t) => t.name);

  return (
    <div className="fuwari-card-base flex flex-col w-full rounded-(--fuwari-radius-large) overflow-hidden relative">
      <div className="pl-6 md:pl-9 pr-6 pt-6 md:pt-7 pb-6 relative w-full md:pr-24">
        <Link
          to="/post/$slug"
          params={{ slug: post.slug }}
          className="transition group w-full block font-bold mb-3 text-3xl fuwari-text-90 hover:text-(--fuwari-primary) active:text-(--fuwari-primary) relative before:w-1 before:h-5 before:rounded-md before:absolute before:-left-5 before:top-1/2 before:-translate-y-1/2 before:hidden md:before:block before:bg-(--fuwari-primary)"
        >
          {post.title}
          <ChevronRight className="inline-block md:hidden text-[2rem] text-(--fuwari-primary) align-middle -mt-1 ml-1" />
          <ChevronRight className="text-(--fuwari-primary) text-[2rem] transition hidden md:inline absolute translate-y-0.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0" />
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
        <div className="fuwari-text-75 mb-3.5 pr-4 wrap-break-word line-clamp-2 md:line-clamp-1">
          {post.summary ?? ""}
        </div>

        {/* Read time */}
        <div className="text-sm fuwari-text-30 flex gap-4">
          <span>{post.readTimeInMinutes} 分钟</span>
        </div>
      </div>

      {/* Enter button - no cover */}
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
    </div>
  );
}
