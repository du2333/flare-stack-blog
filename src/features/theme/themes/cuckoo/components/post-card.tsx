import { ClientOnly, Link, useRouteContext } from "@tanstack/react-router";
import { Calendar, Tag } from "lucide-react";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { coverBackgroundValue } from "@/features/theme/themes/cuckoo/components/cover";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface PostCardProps {
  post: PostItem;
  pinned?: boolean;
}

/**
 * 首页/列表文章卡片(对应原主题 .index-card):
 * 封面媒体卡,标题悬浮于底部,悬停时图片放大 + 毛玻璃 + 文字上移。
 */
export function PostCard({ post, pinned }: PostCardProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const tagNames = (post.tags ?? []).map((t) => t.name);

  return (
    <Link
      to="/post/$slug"
      params={{ slug: post.slug }}
      className="cuckoo-card-base cuckoo-card-hoverable group my-5 block h-87.5 md:h-[350px]"
    >
      <div className="relative h-full w-full overflow-hidden rounded-(--cuckoo-radius)">
        {/* 封面层(封面图 > 兜底图源 > slug 渐变) */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
          style={{
            backgroundImage: coverBackgroundValue(
              siteConfig,
              post.slug,
              post.coverImage,
            ),
          }}
        />
        {/* 悬停毛玻璃(对应原主题 .index-card-filter) */}
        <div className="absolute inset-0 backdrop-blur-0 transition-all duration-300 group-hover:backdrop-blur-[7px]" />
        {/* 底部渐变压暗(对应原主题 .mdui-card-media-covered) */}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent transition-colors duration-200 group-hover:from-black/60" />

        {/* 底部文字区(对应原主题 .index-primary,悬停下移展开) */}
        <div className="absolute right-0 bottom-0 left-0 p-6 text-white transition-all duration-200 lg:-mb-9 lg:group-hover:mb-0">
          <h2 className="text-2xl leading-snug font-medium [text-shadow:1px_1px_2px_rgb(0_0_0/0.4)]">
            {pinned && (
              <span className="mr-2 align-middle text-sm font-bold text-(--cuckoo-accent)">
                [{m.home_pinned_posts()}]
              </span>
            )}
            {post.title}
          </h2>

          {/* 元信息行(悬停时出现) */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/75 opacity-0 transition-opacity duration-200 group-hover:opacity-100 lg:mb-4">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} />
              <ClientOnly fallback="-">
                {formatDate(post.publishedAt)}
              </ClientOnly>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Tag size={14} />
              {tagNames.length > 0 ? tagNames.join(" / ") : m.post_no_tags()}
            </span>
          </div>

          {/* 摘要行(悬停时出现) */}
          <div className="mt-1 line-clamp-2 text-sm text-white/65 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {post.summary ?? ""}
          </div>
        </div>
      </div>
    </Link>
  );
}
