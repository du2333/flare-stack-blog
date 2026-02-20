import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowUp, Share2, Sparkles } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { CommentSection } from "../../components/comments/view/comment-section";
import TableOfContents from "./components/table-of-contents";
import { RelatedPosts, RelatedPostsSkeleton } from "./components/related-posts";
import type { PostPageProps } from "@/features/theme/contract/pages";
import { ContentRenderer } from "@/features/theme/themes/default/components/content/content-renderer";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export function PostPage({ post }: PostPageProps) {
  const navigate = useNavigate();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto pb-20 px-6 md:px-0">
      {/* Back Link */}
      <nav className="py-12 flex items-center justify-between">
        <button
          onClick={() => navigate({ to: "/posts" })}
          className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity"
        >
          <ArrowLeft size={12} />
          <span>返回目录</span>
        </button>
      </nav>

      <article className="space-y-16">
        {/* Header Section */}
        <header className="space-y-8">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground/60 tracking-wider">
              <span className="flex items-center gap-1.5">
                发布于:{" "}
                <ClientOnly fallback={<span>-</span>}>
                  {formatDate(post.publishedAt)}
                </ClientOnly>
              </span>
              <span className="opacity-30">/</span>
              <span className="flex items-center gap-1.5">
                最后更新:{" "}
                <ClientOnly fallback={<span>-</span>}>
                  {formatDate(post.updatedAt)}
                </ClientOnly>
              </span>
              <span className="opacity-30">/</span>
              <span>{post.readTimeInMinutes} 分钟</span>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <>
                  <span className="opacity-30">/</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {post.tags.map((tag) => (
                      <Link
                        key={tag.id}
                        to="/posts"
                        search={{ tagName: tag.name }}
                        className="hover:text-foreground transition-colors"
                      >
                        #{tag.name}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>

            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium leading-[1.1] tracking-tight text-foreground"
              style={{ viewTransitionName: `post-title-${post.slug}` }}
            >
              {post.title}
            </h1>
          </div>

          {post.summary && (
            <div className="bg-muted/30 rounded-lg p-6 space-y-3 border border-border/40">
              <div className="flex items-center gap-2 text-muted-foreground/80 font-medium text-sm uppercase tracking-widest">
                <Sparkles className="w-4 h-4" />
                <span>摘要</span>
              </div>
              <p className="text-lg leading-relaxed text-muted-foreground font-serif">
                {post.summary}
              </p>
            </div>
          )}
        </header>

        {/* Content Layout */}
        <div className="relative">
          {/* Floating TOC for Large Screens */}
          <aside className="hidden xl:block absolute left-full ml-12 top-0 h-full">
            <div className="sticky top-32 w-60">
              <TableOfContents headers={post.toc} />
            </div>
          </aside>

          <main className="max-w-none text-foreground leading-relaxed font-serif">
            <ContentRenderer content={post.contentJson} />

            <footer className="mt-24 pt-8 border-t border-border/20 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground/60 tracking-widest uppercase">
                <span>正文结束</span>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
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
                }}
                className="group h-auto p-0 flex items-center gap-3 text-xs uppercase tracking-widest font-medium text-muted-foreground hover:text-foreground transition-colors bg-transparent hover:bg-transparent"
              >
                <span>分享</span>
                <Share2
                  size={12}
                  strokeWidth={1.5}
                  className="group-hover:-translate-y-0.5 transition-transform"
                />
              </Button>
            </footer>
          </main>
        </div>

        {/* Related Posts */}
        <div className="pt-24 border-t border-border/40">
          <Suspense fallback={<RelatedPostsSkeleton />}>
            <RelatedPosts slug={post.slug} />
          </Suspense>
        </div>

        {/* Comments Section */}
        <div className="pt-12 border-t-0 border-border/40">
          <CommentSection postId={post.id} />
        </div>
      </article>

      {/* Back To Top */}
      <div
        className={`fixed bottom-8 right-8 z-40 transition-all duration-700 ${
          showBackToTop
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-10 pointer-events-none"
        }`}
      >
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="group flex flex-col items-center gap-1.5"
        >
          <ArrowUp
            size={16}
            className="text-muted-foreground/60 group-hover:text-foreground group-hover:-translate-y-1 transition-all duration-300"
          />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/40 group-hover:text-foreground transition-colors duration-300">
            顶部
          </span>
        </button>
      </div>
    </div>
  );
}

// Import ClientOnly inline to avoid circular dependency
function ClientOnly({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  return <>{isMounted ? children : fallback}</>;
}
