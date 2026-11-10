import { formatPublicPostDate } from "@/features/posts/utils/format-public-post-date";
import { Link } from "@tanstack/react-router";
import { BookOpen, Calendar, Edit, Tag } from "lucide-react";
import {
  withCategoryFilter,
  withTagFilter,
  withUncategorizedFilter,
} from "@/features/posts/utils/post-public-search";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface PostMetaProps {
  post: PostItem;
  className?: string;
}

export function PostMeta({ post, className }: PostMetaProps) {
  const published = post.publishedAt;
  const updated = post.updatedAt;
  const isUpdated = Boolean(
    published && updated && published.getTime() !== updated.getTime(),
  );

  return (
    <div
      className={cn(
        "flex flex-wrap text-black/50 dark:text-white/40 items-center gap-4 gap-x-4 gap-y-2",
        className,
      )}
    >
      {/* Publish date */}
      <div className="flex items-center">
        <div className="fuwari-meta-icon">
          <Calendar strokeWidth={1.5} size={20} />
        </div>
        <time
          dateTime={published?.toISOString()}
          className="fuwari-meta-text fuwari-text-50"
        >
          {formatPublicPostDate(published)}
        </time>
      </div>

      {/* Update date */}
      {isUpdated && (
        <div className="flex items-center">
          <div className="fuwari-meta-icon">
            <Edit strokeWidth={1.5} size={20} />
          </div>
          <time
            dateTime={updated?.toISOString()}
            className="fuwari-meta-text fuwari-text-50"
          >
            {formatPublicPostDate(updated)}
          </time>
        </div>
      )}

      <div className="flex items-center">
        <div className="fuwari-meta-icon">
          <BookOpen strokeWidth={1.5} size={20} />
        </div>
        {post.category ? (
          <Link
            to="/posts"
            search={withCategoryFilter(post.category?.name)}
            className="fuwari-expand-animation fuwari-meta-text rounded-md px-1.5 py-1 -m-1.5 transition fuwari-text-50 hover:text-(--theme-accent) whitespace-nowrap"
          >
            {post.category.name}
          </Link>
        ) : (
          <Link
            to="/posts"
            search={withUncategorizedFilter()}
            className="fuwari-expand-animation fuwari-meta-text rounded-md px-1.5 py-1 -m-1.5 transition fuwari-text-50 hover:text-(--theme-accent) whitespace-nowrap"
          >
            {m.post_uncategorized()}
          </Link>
        )}
      </div>

      <div className="flex items-center">
        <div className="fuwari-meta-icon">
          <Tag strokeWidth={1.5} size={20} />
        </div>
        <div className="flex flex-row flex-nowrap items-center gap-x-1.5">
          {post.tags && post.tags.length > 0 ? (
            post.tags.map((tag, i) => (
              <span key={tag.name} className="flex items-center">
                {i > 0 && (
                  <span className="mx-1.5 text-(--fuwari-meta-divider) text-sm">
                    /
                  </span>
                )}
                <Link
                  to="/posts"
                  search={withTagFilter(tag.name)}
                  className="fuwari-expand-animation fuwari-meta-text rounded-md px-1.5 py-1 -m-1.5 transition fuwari-text-50 hover:text-(--theme-accent) whitespace-nowrap"
                >
                  {tag.name}
                </Link>
              </span>
            ))
          ) : (
            <span className="transition fuwari-meta-text fuwari-text-50">
              {m.post_no_tags()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
