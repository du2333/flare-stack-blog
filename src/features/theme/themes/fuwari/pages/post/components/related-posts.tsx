import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { config } from "../../../config";
import { relatedPostsQuery } from "@/features/posts/queries";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface RelatedPostsProps {
  slug: string;
}

export function RelatedPosts({ slug }: RelatedPostsProps) {
  const { data: posts } = useSuspenseQuery(
    relatedPostsQuery(slug, config.post.relatedPostsLimit),
  );

  return (
    <div
      className="fuwari-card-base p-6 fuwari-onload-animation"
      style={{ animationDelay: "300ms" }}
    >
      <h2 className="text-xl font-bold mb-4 fuwari-text-90">相关文章</h2>
      {posts.length === 0 ? (
        <p className="fuwari-text-30 text-sm">暂无相关文章</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 transition">
          {posts.map((post) => (
            <Link
              key={post.id}
              to="/post/$slug"
              params={{ slug: post.slug }}
              className="group flex flex-col justify-between p-4 rounded-xl border border-black/5 dark:border-white/5 hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) transition-colors h-full"
            >
              <h3 className="text-lg font-bold fuwari-text-75 group-hover:text-(--fuwari-primary) mb-2 line-clamp-2">
                {post.title}
              </h3>

              <div className="flex items-center gap-3 fuwari-text-50 text-xs">
                <span>{formatDate(post.publishedAt)}</span>
                <span className="w-1 h-1 rounded-full bg-black/20 dark:bg-white/20" />
                <span>{post.readTimeInMinutes} 分钟</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function RelatedPostsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="flex flex-col justify-between p-4 rounded-xl border border-black/5 dark:border-white/5 h-28"
        >
          <Skeleton className="h-6 w-full mb-2" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-1 w-1 rounded-full" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}
