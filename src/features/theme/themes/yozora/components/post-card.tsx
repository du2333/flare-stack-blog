import { ClientOnly, Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface PostCardProps {
  post: PostItem;
  /** 在列表中的位置，用来生成页边码 p.001 / p.002 */
  index?: number;
  pinned?: boolean;
  popular?: boolean;
  views?: number;
  isLoadingViews?: boolean;
}

/**
 * 书籍目录式条目：页边码 + 标题 + 点线 + 标签/日期。
 * 取代原来的卡片，让首页读起来像一本书的目录页。
 */
export function PostCard({
  post,
  index = 0,
  pinned,
  popular,
  views,
  isLoadingViews,
}: PostCardProps) {
  const tagNames = (post.tags ?? []).map((t) => t.name);
  const pageNo = `p.${String(index + 1).padStart(3, "0")}`;

  return (
    <article className="yz-tocline">
      <Link
        to="/post/$slug"
        params={{ slug: post.slug }}
        className="yz-tocline__link"
        aria-label={post.title}
      >
        <span className="yz-tocline__pno">
          {pageNo}
          {(pinned || popular) && (
            <span
              className="yz-tocline__mark"
              title={pinned ? m.home_pinned_posts() : m.home_popular_posts()}
            />
          )}
        </span>

        <span className="yz-tocline__body">
          <span className="yz-tocline__title">{post.title}</span>
          <span className="yz-tocline__dots" aria-hidden="true" />
          <span className="yz-tocline__meta">
            {tagNames.length > 0 && (
              <span className="yz-tocline__tag">{tagNames[0]}</span>
            )}
            <time dateTime={post.publishedAt?.toISOString()}>
              <ClientOnly fallback="-">
                {formatDate(post.publishedAt)}
              </ClientOnly>
            </time>
          </span>
        </span>

        <span className="yz-tocline__side">
          <span>{m.read_time({ count: post.readTimeInMinutes })}</span>
          {isLoadingViews ? (
            <Skeleton className="h-3 w-8 rounded-sm bg-(--yz-rule)" />
          ) : (
            views !== undefined && <span>{views.toLocaleString()}</span>
          )}
        </span>
      </Link>

      {post.summary && <p className="yz-tocline__summary">{post.summary}</p>}
    </article>
  );
}
