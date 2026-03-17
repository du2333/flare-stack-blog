/**
 * 说说页面组件
 * 
 * 独立页面渲染 Memos 说说，支持图片展示
 */

import { memo } from "react";
import type { MemosPost } from "../schema";

interface MemosPageComponentProps {
  memos: MemosPost[];
}

/**
 * 说说页面 - 与默认主题风格一致
 */
export const MemosPage = memo(({ memos }: MemosPageComponentProps) => {
  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-6 md:px-0 py-12 md:py-20 space-y-16">
      {/* 页面标题 */}
      <section className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-foreground">
          说说
        </h1>
        <p className="text-muted-foreground font-light">
          日常碎碎念，记录灵感闪现的瞬间
        </p>
      </section>

      {/* 说说列表 */}
      <section className="space-y-12">
        {memos.map((memo) => (
          <MemosItem key={memo.id} memo={memo} />
        ))}
        
        {memos.length === 0 && (
          <p className="text-muted-foreground text-center py-12">
            暂无说说
          </p>
        )}
      </section>
    </div>
  );
});

MemosPage.displayName = "MemosPage";

/**
 * 说说单项组件
 */
const MemosItem = memo(({ memo }: { memo: MemosPost }) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 处理内容，移除图片 URL 部分用于显示纯文本
  const getContentWithoutImages = (content: string, images: string[]) => {
    let text = content;
    // 移除 Markdown 图片语法
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "");
    // 移除 HTML img 标签
    text = text.replace(/<img[^>]+>/g, "");
    // 移除图片 URL
    for (const img of images) {
      text = text.replace(img, "");
    }
    return text.trim();
  };

  const contentText = getContentWithoutImages(memo.content, memo.images);

  return (
    <article className="relative pl-8">
      {/* 时间线 */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
      <div className="absolute left-[-3px] top-2 w-2 h-2 rounded-full bg-foreground/30" />
      
      <div className="space-y-3">
        {/* 元信息 */}
        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground/60">
          <time dateTime={memo.createdAt.toISOString()}>
            {formatDate(memo.createdAt)}
          </time>
          {memo.pinned && (
            <span className="text-primary font-medium">置顶</span>
          )}
        </div>

        {/* 图片展示 */}
        {memo.images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
            {memo.images.map((img, index) => (
              <div 
                key={index} 
                className="aspect-square overflow-hidden rounded-lg bg-muted"
              >
                <img
                  src={img}
                  alt={`图片 ${index + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* 内容文本 */}
        {contentText && (
          <div className="text-base leading-relaxed text-foreground/90 space-y-2">
            {contentText.split("\n").map((line, index) => {
              // 处理标题
              if (line.startsWith("# ")) {
                return (
                  <h2 key={index} className="text-xl font-serif font-medium pt-2">
                    {line.slice(2)}
                  </h2>
                );
              }
              // 普通段落
              return line ? (
                <p key={index}>{line}</p>
              ) : (
                <br key={index} />
              );
            })}
          </div>
        )}

        {/* 标签 */}
        {memo.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {memo.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs text-muted-foreground/60 hover:text-foreground/80 transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
});

MemosItem.displayName = "MemosItem";
