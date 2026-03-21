import { Link } from "@tanstack/react-router";
import { ChevronRight, Eye } from "lucide-react";
import type { PostItem } from "@/features/posts/schema/posts.schema";

interface PopularPostCardProps {
  post: PostItem;
  views?: number;
}

export function PopularPostCard({ post, views }: PopularPostCardProps) {
  return (
    <div className="fuwari-card-base flex flex-col w-full h-full rounded-(--fuwari-radius-large) overflow-hidden relative transition-all hover:scale-[1.02] hover:shadow-md hover:bg-(--fuwari-card-bg-hover)">
      <div className="p-5 flex flex-col h-full relative">
        <Link
          to="/post/$slug"
          params={{ slug: post.slug }}
          className="transition group w-full font-bold mb-3 text-lg md:text-xl fuwari-text-90 hover:text-(--fuwari-primary) active:text-(--fuwari-primary) line-clamp-2"
        >
          {post.title}
        </Link>

        <div className="mt-auto flex items-center justify-between pt-2">
          {views != null && (
            <div className="flex items-center gap-1.5 fuwari-text-50 text-sm font-medium">
              <Eye size={16} className="text-(--fuwari-primary)" />
              <span>{views.toLocaleString()}</span>
            </div>
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
