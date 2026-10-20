import { ClientOnly, Link } from "@tanstack/react-router";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { formatDate } from "@/lib/utils";

interface ArchivePostProps {
  post: PostItem;
  /** 全局页边码（跨年份连续） */
  pageNo: number;
}

/** 目录条目：与首页共用 yz-tocline 语言（页边码 + 点线 + 衬线标题） */
export function ArchivePost({ post, pageNo }: ArchivePostProps) {
  const tagNames = (post.tags ?? []).map((t) => t.name);

  return (
    <article className="yz-tocline">
      <Link
        to="/post/$slug"
        params={{ slug: post.slug }}
        className="yz-tocline__link"
        aria-label={post.title}
      >
        <span className="yz-tocline__pno">
          {`p.${String(pageNo).padStart(3, "0")}`}
        </span>

        <span className="yz-tocline__body">
          <span className="yz-tocline__title">{post.title}</span>
          <span className="yz-tocline__dots" aria-hidden="true" />
          <span className="yz-tocline__meta">
            {tagNames.length > 0 && (
              <span className="yz-tocline__tag">{tagNames[0]}</span>
            )}
            <time dateTime={post.publishedAt?.toISOString()}>
              <ClientOnly fallback="-">{formatDate(post.publishedAt)}</ClientOnly>
            </time>
          </span>
        </span>
      </Link>
    </article>
  );
}
