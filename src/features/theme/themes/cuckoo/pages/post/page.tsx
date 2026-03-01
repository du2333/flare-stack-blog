import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Clock, Share2, Tag } from "lucide-react";
import { toast } from "sonner";
import { ContentRenderer } from "../../components/content/content-renderer";
import type { PostPageProps } from "@/features/theme/contract/pages";
import { formatDate } from "@/lib/utils";

export function PostPage({ post }: PostPageProps) {
  const navigate = useNavigate();

  const handleShare = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        toast.success("链接已复制", {
          description: "文章链接已复制到剪贴板",
        });
      })
      .catch(() => {
        toast.error("复制失败", {
          description: "无法访问剪贴板，请手动复制链接",
        });
      });
  };

  return (
    <article className="space-y-8 cuckoo-fade-in">
      {/* Back Button */}
      <button
        onClick={() => navigate({ to: "/posts" })}
        className="flex items-center gap-2 cuckoo-text-secondary hover:cuckoo-primary transition-colors"
      >
        <ArrowLeft size={16} />
        <span className="text-sm">返回文章列表</span>
      </button>

      {/* Article Header */}
      <header className="space-y-6">
        <h1
          className="text-2xl md:text-3xl lg:text-4xl font-bold cuckoo-text-primary leading-tight"
          style={{ viewTransitionName: `post-title-${post.slug}` }}
        >
          {post.title}
        </h1>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm cuckoo-text-muted">
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            {formatDate(post.publishedAt)}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {post.readTimeInMinutes} 分钟阅读
          </span>
          {post.tags && post.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag size={14} />
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  to="/posts"
                  search={{ tagName: tag.name }}
                  className="cuckoo-tag hover:cuckoo-tag-primary"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {post.summary && (
          <div className="cuckoo-card p-6 border-l-4 border-l-[var(--cuckoo-primary)]">
            <p className="cuckoo-text-secondary leading-relaxed">
              {post.summary}
            </p>
          </div>
        )}
      </header>

      {/* Article Content */}
      <div className="cuckoo-card p-6 md:p-8">
        <ContentRenderer content={post.contentJson || {}} />

        {/* Article Footer */}
        <footer className="mt-12 pt-6 border-t border-[var(--cuckoo-border)]">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-sm cuckoo-text-muted">正文结束</span>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 cuckoo-btn cuckoo-btn-secondary"
            >
              <Share2 size={14} />
              <span>分享文章</span>
            </button>
          </div>
        </footer>
      </div>

      {/* Related Posts - Placeholder */}
      <div className="cuckoo-card p-6">
        <h2 className="text-lg font-bold cuckoo-text-primary mb-4">相关文章</h2>
        <p className="cuckoo-text-muted text-sm">暂无相关文章</p>
      </div>
    </article>
  );
}
