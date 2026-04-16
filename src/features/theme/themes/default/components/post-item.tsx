import { Link } from "@tanstack/react-router";
import { Eye, Pin } from "lucide-react";
import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostItem as PostItemType } from "@/features/posts/schema/posts.schema";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface PostItemProps {
  post: PostItemType;
  pinned?: boolean;
  views?: number;
  isLoadingViews?: boolean;
}

export const PostItem = memo(
  ({ post, pinned, views, isLoadingViews }: PostItemProps) => {
    return (
      <div className="group border-b border-border/40 last:border-0">
        <Link
          to="/post/$slug"
          params={{ slug: post.slug }}
          className="block py-8 md:py-10 transition-all duration-300 hover:pl-4"
        >
          <div className="flex flex-col gap-3">
            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-mono text-muted-foreground/60 tracking-wider">
              <time
                dateTime={post.publishedAt?.toISOString()}
                className="whitespace-nowrap"
              >
                {formatDate(post.publishedAt)}
              </time>
              {post.tags && post.tags.length > 0 && (
                <>
                  <span className="opacity-30">/</span>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="text-muted-foreground/60 whitespace-nowrap"
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {isLoadingViews ? (
                <>
                  <span className="opacity-30">/</span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-muted-foreground/60">
                    <Eye size={12} />
                    <Skeleton className="h-3 w-12 rounded bg-muted-foreground/20" />
                  </span>
                </>
              ) : views !== undefined ? (
                <>
                  <span className="opacity-30">/</span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-muted-foreground/60">
                    <Eye size={12} />
                    {m.post_views_count({ count: views })}
                  </span>
                </>
              ) : null}
            </div>

            <h3
              className="text-2xl md:text-3xl font-serif font-medium text-foreground group-hover:text-foreground/70 transition-colors duration-300 flex items-center gap-3"
              style={{ viewTransitionName: `post-title-${post.slug}` }}
            >
              {pinned && (
                <Pin
                  size={22}
                  className="text-muted-foreground/50 fill-muted"
                  strokeWidth={1.5}
                />
              )}
              <span className="line-clamp-2">{post.title}</span>
            </h3>

            <p className="text-muted-foreground font-light leading-relaxed max-w-2xl line-clamp-2 text-sm md:text-base font-sans mt-1 group-hover:text-muted-foreground/80">
              {post.summary}
            </p>
          </div>
        </Link>
      </div>
    );
  },
);

PostItem.displayName = "PostItem";
