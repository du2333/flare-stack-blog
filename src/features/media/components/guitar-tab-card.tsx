"use client";

import { Link } from "@tanstack/react-router";
import {
  Guitar,
  Music2,
  Play,
  Clock,
  Layers,
  User,
  ExternalLink,
} from "lucide-react";
import { memo } from "react";
import type { GuitarTabWithMeta } from "../data/media.data";

// ── 工具函数 ──────────────────────────────────────────

function getDisplayName(fileName: string): string {
  return fileName.replace(/\.(gp[345x]?|gp)$/i, "").replace(/[-_]/g, " ");
}

function getExtension(fileName: string): string {
  const match = fileName.match(/\.(gp[345x]?|gp)$/i);
  return match ? match[1].toUpperCase() : "GP";
}

// ── 列表视图卡片 ─────────────────────────────────────

interface ListCardProps {
  tab: GuitarTabWithMeta;
  isActive?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const GuitarTabListCard = memo(function GuitarTabListCard({
  tab,
  isActive,
  onClick,
}: ListCardProps) {
  const displayTitle = tab.title || getDisplayName(tab.fileName);
  const artist = tab.artist || "";
  const album = tab.album || "";
  const ext = getExtension(tab.fileName);
  const trackCount = tab.trackCount ?? 0;
  const tempo = tab.tempo ?? 0;
  const coverUrl = tab.coverKey
    ? `/images/${tab.coverKey}?w=80&h=80&fit=cover`
    : null;

  return (
    <button
      onClick={onClick}
      data-active={isActive || undefined}
      className="w-full text-left cursor-pointer group relative overflow-hidden rounded-2xl border border-border/30 bg-card transition-all duration-300 ease-out hover:border-accent/40 hover:shadow-[0_4px_24px_-6px_hsl(var(--accent)/0.12)] active:scale-[0.997] data-[active]:border-accent/50"
    >
      {/* 顶部装饰渐变条 */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-accent/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="p-4 sm:p-5 flex gap-4">
        {/* 左侧：封面图 / 图标 */}
        <div className="shrink-0 relative">
          {coverUrl ? (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-muted/20">
              <img
                src={coverUrl}
                alt={displayTitle}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-accent/15 via-accent/8 to-accent/5 flex items-center justify-center overflow-hidden group-hover:from-accent/20 group-hover:via-accent/12 group-hover:to-accent/8 transition-all duration-500">
              <Guitar
                size={24}
                className="text-accent/70 group-hover:text-accent group-hover:scale-110 transition-all duration-300"
              />
            </div>
          )}
          {/* 格式角标 */}
          <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-background border border-border/50 text-[9px] font-mono font-semibold text-muted-foreground/70 uppercase tracking-wider">
            {ext}
          </div>
        </div>

        {/* 中间：曲目信息 */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="text-sm sm:text-[15px] font-medium leading-snug truncate group-hover:text-accent transition-colors duration-300">
            {displayTitle}
          </h3>
          {tab.slug && (
            <Link
              to="/guitar-tab/$slug"
              params={{ slug: tab.slug }}
              className="shrink-0 p-1 text-muted-foreground/30 hover:text-accent transition-colors"
              onClick={(e) => e.stopPropagation()}
              title="查看详情"
            >
              <ExternalLink size={12} />
            </Link>
          )}

          <div className="flex items-center gap-1.5 mt-1 min-w-0">
            {artist ? (
              <>
                <Music2 size={10} className="shrink-0 text-muted-foreground/40" />
                <span className="text-xs text-muted-foreground truncate">
                  {artist}
                </span>
                {album && (
                  <>
                    <span className="text-muted-foreground/20 shrink-0">·</span>
                    <span className="text-xs text-muted-foreground/60 truncate hidden sm:inline">
                      {album}
                    </span>
                  </>
                )}
              </>
            ) : (
              <span className="text-[11px] text-muted-foreground/40 italic">
                未知艺术家
              </span>
            )}
          </div>

          {/* 元数据标签 */}
          <div className="flex items-center gap-2.5 mt-2 flex-wrap">
            {trackCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50 font-mono">
                <Layers size={9} />
                {trackCount} 轨
              </span>
            )}
            {tempo > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50 font-mono">
                <Clock size={9} />
                {tempo} BPM
              </span>
            )}
            {tab.sizeInBytes > 0 && (
              <span className="text-[10px] text-muted-foreground/50 font-mono">
                {tab.sizeInBytes >= 1048576
                  ? `${(tab.sizeInBytes / 1048576).toFixed(1)} MB`
                  : `${(tab.sizeInBytes / 1024).toFixed(0)} KB`}
              </span>
            )}
            {tab.uploaderName && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50">
                {tab.uploaderImage ? (
                  <img
                    src={tab.uploaderImage}
                    alt={tab.uploaderName}
                    className="w-3 h-3 rounded-full"
                  />
                ) : (
                  <User size={9} />
                )}
                {tab.uploaderName}
              </span>
            )}
          </div>
        </div>

        {/* 右侧：播放按钮 */}
        <div className="shrink-0 self-center">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-accent/10 text-accent/70 transition-all duration-300 group-hover:bg-accent group-hover:text-accent-foreground group-hover:scale-110 group-hover:shadow-[0_0_20px_-4px_hsl(var(--accent)/0.3)] group-active:scale-95">
            <Play size={16} className="ml-0.5" />
          </div>
        </div>
      </div>
    </button>
  );
});

// ── 缩略图视图卡片 ───────────────────────────────────

interface GridCardProps {
  tab: GuitarTabWithMeta;
  isActive?: boolean;
  size: "small" | "large";
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const GuitarTabGridCard = memo(function GuitarTabGridCard({
  tab,
  isActive,
  size,
  onClick,
}: GridCardProps) {
  const displayTitle = tab.title || getDisplayName(tab.fileName);
  const artist = tab.artist || "";
  const ext = getExtension(tab.fileName);
  const coverSize = size === "large" ? 400 : 200;
  const coverUrl = tab.coverKey
    ? `/images/${tab.coverKey}?w=${coverSize}&h=${coverSize}&fit=cover`
    : null;

  return (
    <button
      onClick={onClick}
      data-active={isActive || undefined}
      className="text-left cursor-pointer group relative rounded-2xl border border-border/30 bg-card overflow-hidden transition-all duration-300 ease-out hover:border-accent/40 hover:shadow-[0_6px_24px_-6px_hsl(var(--accent)/0.15)] active:scale-[0.98] data-[active]:border-accent/50"
    >
      {/* 封面区域 */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-accent/10 via-accent/5 to-muted/10 overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={displayTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Guitar
              size={size === "large" ? 48 : 32}
              strokeWidth={1}
              className="text-accent/30 group-hover:text-accent/50 group-hover:scale-110 transition-all duration-500"
            />
          </div>
        )}

        {/* 播放覆盖层 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-accent/90 text-accent-foreground flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-lg">
            <Play size={20} className="ml-1" />
          </div>
        </div>

        {/* 格式角标 */}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-background/80 backdrop-blur-sm border border-border/30 text-[9px] font-mono font-semibold text-muted-foreground/70 uppercase tracking-wider">
          {ext}
        </div>
      </div>

      {/* 信息区域 */}
      <div className={size === "large" ? "p-4" : "p-3"}>
        <div className="flex items-center gap-1">
          <h3
            className={`${size === "large" ? "text-sm" : "text-xs"} font-medium leading-snug truncate group-hover:text-accent transition-colors duration-300`}
          >
            {displayTitle}
          </h3>
          {tab.slug && size === "large" && (
            <Link
              to="/guitar-tab/$slug"
              params={{ slug: tab.slug }}
              className="shrink-0 p-0.5 text-muted-foreground/30 hover:text-accent transition-colors"
              onClick={(e) => e.stopPropagation()}
              title="查看详情"
            >
              <ExternalLink size={10} />
            </Link>
          )}
        </div>
        <p
          className={`${size === "large" ? "text-xs mt-1" : "text-[11px] mt-0.5"} text-muted-foreground/60 truncate`}
        >
          {artist || "未知艺术家"}
        </p>
        {tab.uploaderName && size === "large" && (
          <p className="text-[10px] text-muted-foreground/40 mt-1 truncate flex items-center gap-1">
            {tab.uploaderImage ? (
              <img
                src={tab.uploaderImage}
                alt={tab.uploaderName}
                className="w-3 h-3 rounded-full inline"
              />
            ) : (
              <User size={8} />
            )}
            {tab.uploaderName}
          </p>
        )}
      </div>
    </button>
  );
});
