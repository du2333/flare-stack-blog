import { Calendar, Edit, Tag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { PostItem } from "@/features/posts/posts.schema";
import { cn, formatDate } from "@/lib/utils";

interface PostMetaProps {
  post: PostItem;
  className?: string;
}

export function PostMeta({ post, className }: PostMetaProps) {
  const published = post.publishedAt || new Date();
  const updated = post.updatedAt;

  // Date logic: only show updated if it's different from published date
  const isUpdated = formatDate(published) !== formatDate(updated);

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
        <span className="text-sm font-medium fuwari-text-50">
          {formatDate(published)}
        </span>
      </div>

      {/* Update date */}
      {isUpdated && (
        <div className="flex items-center">
          <div className="fuwari-meta-icon">
            <Edit strokeWidth={1.5} size={20} />
          </div>
          <span className="text-sm font-medium fuwari-text-50">
            {formatDate(updated)}
          </span>
        </div>
      )}

      {/* Categories / Tags */}
      {/* We combine them like tags since blog-cms schema uses tags for categorization */}
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
                  search={{ tagName: tag.name }}
                  className="transition fuwari-text-50 text-sm font-medium hover:text-(--fuwari-primary) whitespace-nowrap"
                >
                  {tag.name}
                </Link>
              </span>
            ))
          ) : (
            <span className="transition fuwari-text-50 text-sm font-medium">
              无标签
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
