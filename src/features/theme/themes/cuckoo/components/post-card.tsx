import { Link } from "@tanstack/react-router";
import { Calendar, Tag } from "lucide-react";
import type { PostItem } from "@/features/posts/posts.schema";
import { formatDate } from "@/lib/utils";

interface PostCardProps {
  post: PostItem;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Link
      to="/post/$slug"
      params={{ slug: post.slug }}
      className="cuckoo-post-card block"
    >
      {/* Title */}
      <h2 className="cuckoo-post-card-title">{post.title}</h2>

      {/* Excerpt */}
      {post.summary && (
        <p className="cuckoo-post-card-excerpt line-clamp-2">{post.summary}</p>
      )}

      {/* Meta */}
      <div className="cuckoo-post-card-meta">
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {formatDate(post.publishedAt)}
        </span>
        {post.tags && post.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag size={12} />
            {post.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="cuckoo-tag">
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
