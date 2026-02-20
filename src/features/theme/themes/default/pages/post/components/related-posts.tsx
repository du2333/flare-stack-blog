import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
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

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="space-y-8 animate-in fade-in duration-500 delay-300 fill-mode-both">
      <div className="flex items-center gap-2 text-muted-foreground/60 font-medium text-xs uppercase tracking-widest">
        <span className="opacity-50">///</span>
        <span>相关阅读</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <Link
            key={post.id}
            to="/post/$slug"
            params={{ slug: post.slug }}
            className="group flex flex-col h-full space-y-3 p-4 -mx-4 md:mx-0 md:p-0 rounded-lg hover:bg-muted/40 md:hover:bg-transparent transition-colors"
          >
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 font-mono tracking-wider">
              <span>{formatDate(post.publishedAt)}</span>
              <span className="opacity-30">/</span>
              <span>{post.readTimeInMinutes} 分钟</span>
            </div>

            <h3 className="text-lg font-serif leading-snug group-hover:text-primary transition-colors">
              {post.title}
            </h3>

            <div className="pt-2 mt-auto flex items-center gap-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
              <span>阅读</span>
              <ArrowRight
                size={12}
                className="-ml-0.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function RelatedPostsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-muted-foreground/60 font-medium text-xs uppercase tracking-widest">
        <span className="opacity-50">///</span>
        <Skeleton className="h-3 w-16" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-3 w-24 opacity-60" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
