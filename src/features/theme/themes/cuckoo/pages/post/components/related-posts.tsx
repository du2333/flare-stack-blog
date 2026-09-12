import { useSuspenseQuery } from "@tanstack/react-query";
import { ClientOnly, Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { relatedPostsQuery } from "@/features/posts/queries";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { config } from "../../../config";

interface RelatedPostsProps {
  slug: string;
}

/**
 * 相关文章(半透明卡片网格)。
 */
export function RelatedPosts({ slug }: RelatedPostsProps) {
  const { data: posts } = useSuspenseQuery(
    relatedPostsQuery(slug, config.post.relatedPostsLimit),
  );

  if (posts.length === 0) return null;

  return (
    <div
      className="cuckoo-card-base cuckoo-card-hoverable mt-5 p-6 cuckoo-onload-animation"
      style={{ animationDelay: "250ms" }}
    >
      <h2 className="cuckoo-text-90 mb-4 text-lg font-bold">
        {m.post_related_posts()}
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {posts.map((post) => (
          <Link
            key={post.id}
            to="/post/$slug"
            params={{ slug: post.slug }}
            className="cuckoo-text-75 hover:bg-(--cuckoo-btn-regular-bg) group flex h-full flex-col justify-between rounded-(--cuckoo-radius) border border-transparent p-4 transition-colors hover:border-(--cuckoo-divider)"
          >
            <h3 className="group-hover:text-(--cuckoo-accent) mb-2 line-clamp-2 text-base font-bold">
              {post.title}
            </h3>
            <div className="cuckoo-text-50 flex items-center gap-3 text-xs">
              <span>
                <ClientOnly fallback="-">
                  {formatDate(post.publishedAt)}
                </ClientOnly>
              </span>
              <span className="h-1 w-1 rounded-full bg-current opacity-40" />
              <span>{m.read_time({ count: post.readTimeInMinutes })}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function RelatedPostsSkeleton() {
  return (
    <div className="cuckoo-card-base mt-5 animate-pulse p-6">
      <Skeleton className="cuckoo-text-30 mb-4 h-6 w-24 rounded bg-current" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-20 rounded-(--cuckoo-radius) border border-transparent p-4"
          >
            <Skeleton className="cuckoo-text-30 h-5 w-full rounded bg-current" />
          </div>
        ))}
      </div>
    </div>
  );
}
