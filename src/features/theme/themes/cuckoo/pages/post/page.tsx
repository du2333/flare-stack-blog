import { Link, useRouteContext } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { Suspense, useEffect } from "react";
import type { PostPageProps } from "@/features/theme/contract/pages";
import { CuckooCommentSection } from "@/features/theme/themes/cuckoo/components/comments/view/comment-section";
import { ContentRenderer } from "@/features/theme/themes/cuckoo/components/content/content-renderer";
import { coverBackgroundValue } from "@/features/theme/themes/cuckoo/components/cover";
import { setSidebarToc } from "@/features/theme/themes/cuckoo/components/toc-store";
import { authClient } from "@/lib/auth/auth.client";
import { m } from "@/paraglide/messages";
import { PostMeta } from "./components/post-meta";
import { RelatedPosts, RelatedPostsSkeleton } from "./components/related-posts";

/** 超过 30 天未更新时显示过时提醒(对应原主题 .post-alert) */
function getOutdatedInfo(
  publishedAt: Date | null,
  updatedAt: Date | null,
): { createdDays: number; modifiedDays: number } | null {
  if (!publishedAt) return null;
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const createdDays = Math.max(
    0,
    Math.floor((now - publishedAt.getTime()) / day),
  );
  const modifiedDays = Math.max(
    0,
    Math.floor((now - (updatedAt ?? publishedAt).getTime()) / day),
  );
  if (modifiedDays <= 30) return null;
  return { createdDays, modifiedDays };
}

export function PostPage({ post }: PostPageProps) {
  const { data: session } = authClient.useSession();
  const { siteConfig } = useRouteContext({ from: "__root__" });

  // 把目录交给侧栏渲染(对应原主题侧栏 #toc 模块)
  useEffect(() => {
    setSidebarToc(post.toc);
    return () => setSidebarToc([]);
  }, [post.toc]);

  return (
    <div className="relative w-full">
      {/* 文章卡片(对应原主题 .post-card) */}
      <article className="cuckoo-card-base cuckoo-card-hoverable cuckoo-onload-animation mt-5">
        {/* 封面标题区(对应原主题 .post-card-media) */}
        <div className="relative h-67.5 overflow-hidden md:h-[350px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: coverBackgroundValue(
                siteConfig,
                post.slug,
                post.coverImage,
              ),
            }}
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute right-0 bottom-0 left-0 p-6 text-white">
            <h1
              className="text-2xl leading-snug font-medium [text-shadow:1px_1px_2px_rgb(0_0_0/0.4)] md:text-3xl"
              style={{ viewTransitionName: `post-title-${post.slug}` }}
            >
              {post.title}
            </h1>
            <PostMeta
              post={post}
              className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-white/75"
            />
          </div>
        </div>

        {/* 管理员编辑入口 */}
        {session?.user.role === "admin" && (
          <div className="flex justify-end px-5 pt-4">
            <Link
              to="/admin/posts/edit/$id"
              params={{ id: String(post.id) }}
              className="cuckoo-btn-regular h-8 gap-1.5 px-3 text-xs"
            >
              <Pencil size={13} />
              {m.post_edit()}
            </Link>
          </div>
        )}

        {/* 过时提醒(对应原主题 .post-alert) */}
        {(() => {
          const outdated = getOutdatedInfo(post.publishedAt, post.updatedAt);
          if (!outdated) return null;
          return (
            <div
              className="mx-5 mt-4 flex items-start gap-2 rounded-(--cuckoo-radius) p-3 text-sm text-white"
              style={{ backgroundColor: "#f87171" }}
            >
              <span className="mt-0.5">⚠</span>
              <span>
                {m.post_outdated_cuckoo({
                  created: outdated.createdDays,
                  modified: outdated.modifiedDays,
                })}
              </span>
            </div>
          );
        })()}

        {/* 正文(对应原主题 .post-content.mdui-typo) */}
        <div className="cuckoo-custom-md prose dark:prose-invert prose-base max-w-none! p-5 md:p-6">
          <ContentRenderer content={post.contentJson} />
        </div>
      </article>

      {/* 相关文章 */}
      <Suspense fallback={<RelatedPostsSkeleton />}>
        <RelatedPosts slug={post.slug} />
      </Suspense>

      {/* 评论区 */}
      <CuckooCommentSection postId={post.id} />
    </div>
  );
}
