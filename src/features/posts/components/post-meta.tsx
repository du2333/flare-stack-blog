import { formatPublicPostDate } from "@/features/posts/utils/format-public-post-date";
import { Link } from "@tanstack/react-router";
import { BookOpen, Calendar, Edit, Tag, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  withCategoryFilter,
  withTagFilter,
  withUncategorizedFilter,
} from "@/features/posts/utils/post-public-search";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface PostMetaProps {
  post: PostItem;
  className?: string;
}

/**
 * One item of a Post's meta: its icon block, then its text. In the inline
 * form the text stands alone, and the row (`fuwari-meta-inline`) sets a dot
 * before it.
 */
export function MetaItem({
  icon: Icon,
  className = "flex items-center",
  children,
}: {
  icon: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  const { meta } = useThemeRecipe();
  return (
    <div className={className}>
      {meta === "chips" ? (
        <div className="fuwari-meta-icon">
          <Icon strokeWidth={1.5} size={20} />
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function PostMeta({ post, className }: PostMetaProps) {
  const inline = useThemeRecipe().meta === "inline";
  // Plain text drops the hover pad, which would run into the dot before it.
  const linkClass = inline
    ? "fuwari-meta-text transition fuwari-text-50 hover:text-(--theme-accent) whitespace-nowrap"
    : "fuwari-expand-animation fuwari-meta-text rounded-md px-1.5 py-1 -m-1.5 transition fuwari-text-50 hover:text-(--theme-accent) whitespace-nowrap";
  const published = post.publishedAt;
  const updated = post.updatedAt;
  const isUpdated = Boolean(
    published && updated && published.getTime() !== updated.getTime(),
  );

  return (
    <div
      className={cn(
        inline
          ? "flex flex-wrap text-(--theme-meta-color) items-center gap-x-2 gap-y-1 fuwari-meta-inline"
          : "flex flex-wrap text-(--theme-meta-color) items-center gap-4 gap-x-4 gap-y-2",
        className,
      )}
    >
      {/* Publish date */}
      <MetaItem icon={Calendar}>
        <time
          dateTime={published?.toISOString()}
          className="fuwari-meta-text fuwari-text-50"
        >
          {formatPublicPostDate(published)}
        </time>
      </MetaItem>

      {/* Update date */}
      {isUpdated && (
        <MetaItem icon={Edit}>
          <time
            dateTime={updated?.toISOString()}
            className="fuwari-meta-text fuwari-text-50"
          >
            {formatPublicPostDate(updated)}
          </time>
        </MetaItem>
      )}

      <MetaItem icon={BookOpen}>
        {post.category ? (
          <Link
            to="/posts"
            search={withCategoryFilter(post.category?.name)}
            className={linkClass}
          >
            {post.category.name}
          </Link>
        ) : (
          <Link
            to="/posts"
            search={withUncategorizedFilter()}
            className={linkClass}
          >
            {m.post_uncategorized()}
          </Link>
        )}
      </MetaItem>

      <MetaItem icon={Tag}>
        <div className="flex flex-row flex-nowrap items-center gap-x-1.5">
          {post.tags && post.tags.length > 0 ? (
            post.tags.map((tag, i) => (
              <span key={tag.name} className="flex items-center">
                {i > 0 && (
                  <span className="mx-1.5 text-(--theme-rule,var(--fuwari-meta-divider)) text-sm">
                    /
                  </span>
                )}
                <Link
                  to="/posts"
                  search={withTagFilter(tag.name)}
                  className={linkClass}
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
      </MetaItem>
    </div>
  );
}
