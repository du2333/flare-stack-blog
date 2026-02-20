import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { config } from "../../config";
import type { PostListItem } from "@/features/posts/posts.schema";
import {
  featuredPostsQuery,
  postsInfiniteQueryOptions,
} from "@/features/posts/queries";

const { featuredPostsLimit } = config.home;

export function PostPageSkeleton() {
  const navigate = useNavigate();
  const { slug } = useParams({ from: "/_public/post/$slug" });
  const queryClient = useQueryClient();

  // Optimistic UI: Try to get the post title from cache to verify transition immediately
  const cachedPost =
    // Try finding in featured posts
    queryClient
      .getQueryData<
        Array<PostListItem>
      >(featuredPostsQuery(featuredPostsLimit).queryKey)
      ?.find((p) => p.slug === slug) ||
    // Try finding in infinite query pages
    queryClient
      .getQueryData<{ pages: Array<{ items: Array<PostListItem> }> }>(
        postsInfiniteQueryOptions({}).queryKey,
      )
      ?.pages.flatMap((p) => p.items)
      .find((p) => p.slug === slug);

  return (
    <div className="w-full max-w-3xl mx-auto pb-20 px-6 md:px-0">
      {/* Back Link Skeleton (matches real page) */}
      <nav className="py-12 flex items-center justify-between">
        <button
          onClick={() => navigate({ to: "/posts" })}
          className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity"
        >
          <ArrowLeft size={12} />
          <span>返回目录</span>
        </button>
      </nav>

      <div className="space-y-16">
        {/* Header Section Skeleton */}
        <header className="space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-4 w-16 bg-muted animate-pulse rounded-sm"></div>
              <div className="h-4 w-24 bg-muted animate-pulse rounded-sm"></div>
              <div className="h-4 w-20 bg-muted animate-pulse rounded-sm"></div>
            </div>

            {cachedPost ? (
              // Optimistic UI: Render real title if available in cache
              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium leading-[1.1] tracking-tight text-foreground"
                style={{ viewTransitionName: `post-title-${cachedPost.slug}` }}
              >
                {cachedPost.title}
              </h1>
            ) : (
              // Fallback Skeleton Title
              <div className="space-y-4">
                <div className="h-12 md:h-16 w-full bg-muted animate-pulse rounded-sm"></div>
                <div className="h-12 md:h-16 w-3/4 bg-muted animate-pulse rounded-sm"></div>
              </div>
            )}
          </div>

          <div className="border-l-[1.5px] border-border pl-6 space-y-3">
            <div className="h-5 w-full bg-muted animate-pulse rounded-sm"></div>
            <div className="h-5 w-5/6 bg-muted animate-pulse rounded-sm"></div>
          </div>
        </header>

        {/* Content Layout Skeleton */}
        <div className="relative">
          <main className="max-w-none space-y-12">
            {/* Content Blocks */}
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-4">
                  <div className="h-4 w-full bg-muted animate-pulse rounded-sm"></div>
                  <div className="h-4 w-full bg-muted animate-pulse rounded-sm"></div>
                  <div className="h-4 w-11/12 bg-muted animate-pulse rounded-sm"></div>
                  <div className="h-4 w-full bg-muted animate-pulse rounded-sm"></div>
                  <div className="h-4 w-4/5 bg-muted animate-pulse rounded-sm"></div>

                  {i === 2 && (
                    <div className="my-16 h-64 w-full bg-muted animate-pulse rounded-sm"></div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer Skeleton */}
            <footer className="mt-24 pt-8 border-t border-border/20 flex justify-between items-center">
              <div className="h-4 w-32 bg-muted animate-pulse rounded-sm"></div>
              <div className="h-4 w-16 bg-muted animate-pulse rounded-sm"></div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
