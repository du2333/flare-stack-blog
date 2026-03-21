import { Link } from "@tanstack/react-router";
import { ChevronRight, Eye, Flame, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostItem } from "@/features/posts/schema/posts.schema";

interface PopularPostCardProps {
  post: PostItem;
  views?: number;
  isLoadingViews?: boolean;
  rank?: number;
}

export function PopularPostCard({
  post,
  views,
  isLoadingViews,
  rank,
}: PopularPostCardProps) {
  const tagNames = (post.tags ?? []).map((t) => t.name);

  return (
    <div className="fuwari-card-base flex flex-col w-full h-full rounded-(--fuwari-radius-large) overflow-hidden relative transition-all hover:scale-[1.02] hover:shadow-md">
      <div className="p-5 flex flex-col h-full relative">
        {/* Header Row: Primary Tag & Rank Badge */}
        <div className="flex items-center justify-between gap-2 mb-2">
          {tagNames.length > 0 ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-(--fuwari-primary) shrink-0">
              <Tag size={13} strokeWidth={2.5} />
              <span className="line-clamp-1">{tagNames[0]}</span>
            </div>
          ) : (
            <div />
          )}

          {rank !== undefined && (
            <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full shrink-0">
              <Flame size={12} strokeWidth={2.5} className="-mt-px" />
              <span>TOP {rank}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <Link
          to="/post/$slug"
          params={{ slug: post.slug }}
          className="transition group w-full font-bold mb-2 text-lg md:text-xl fuwari-text-90 hover:text-(--fuwari-primary) active:text-(--fuwari-primary) line-clamp-2"
        >
          {post.title}
        </Link>

        {/* Summary */}
        <div className="text-sm fuwari-text-50 line-clamp-2 mb-4 leading-relaxed">
          {post.summary ?? ""}
        </div>

        <div className="mt-auto flex items-center justify-between pt-2 border-t border-dashed border-black/5 dark:border-white/5">
          {isLoadingViews ? (
            <div className="flex items-center gap-1.5 fuwari-text-50 text-sm font-medium">
              <Eye size={16} className="text-(--fuwari-primary)" />
              <Skeleton className="h-4 w-8 rounded bg-black/10 dark:bg-white/10" />
            </div>
          ) : views != null ? (
            <div className="flex items-center gap-1.5 fuwari-text-50 text-sm font-medium">
              <Eye size={16} className="text-(--fuwari-primary)" />
              <span>{views.toLocaleString()}</span>
            </div>
          ) : (
            <div className="w-1" />
          )}

          <Link
            to="/post/$slug"
            params={{ slug: post.slug }}
            aria-label={post.title}
            className="flex items-center justify-center fuwari-btn-regular w-8 h-8 rounded-lg active:scale-95 bg-(--fuwari-primary)/5 hover:bg-(--fuwari-primary)/10 ml-auto"
          >
            <ChevronRight
              className="text-(--fuwari-primary)"
              strokeWidth={2}
              size={18}
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
