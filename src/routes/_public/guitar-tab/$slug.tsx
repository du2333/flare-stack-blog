import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock,
  FileText,
  Guitar,
  Layers,
  Music2,
  Play,
  User,
} from "lucide-react";
import { useCallback, useState } from "react";
import { GuitarProViewer } from "@/features/media/components/guitar-pro-viewer";
import { guitarTabDetailQuery } from "@/features/media/queries";
import { blogConfig } from "@/blog.config";

export const Route = createFileRoute("/_public/guitar-tab/$slug")({
  component: GuitarTabDetailPage,
  beforeLoad: () => {
    if (!blogConfig.features.guitarTabs) throw redirect({ to: "/" });
  },
  loader: async ({ context, params }) => {
    const result = await context.queryClient.ensureQueryData(
      guitarTabDetailQuery(params.slug),
    );
    if (!result) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    const tab = loaderData?.tab;
    const title = tab
      ? `${tab.title || tab.fileName}${tab.artist ? ` — ${tab.artist}` : ""}`
      : "吉他谱";
    return {
      meta: [
        { title },
        { name: "description", content: `在线播放 ${title} 吉他谱` },
      ],
    };
  },
});

function GuitarTabDetailPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(guitarTabDetailQuery(slug));

  if (!data) return null;

  const { tab, relatedTabs } = data;
  const displayTitle = tab.title || tab.fileName;
  const coverUrl = tab.coverKey
    ? `/images/${tab.coverKey}?w=300&h=300&fit=cover`
    : null;
  const fileUrl = `/images/${tab.key}?original=true`;

  // 查看器状态
  const [viewerOpen, setViewerOpen] = useState(false);

  const handlePlay = useCallback(() => {
    setViewerOpen(true);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setViewerOpen(false);
  }, []);

  // 轨道名称解析
  let trackNames: string[] = [];
  try {
    trackNames = JSON.parse(tab.trackNames || "[]");
  } catch {
    // ignore
  }

  return (
    <div className="min-h-[60vh] py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* 返回按钮 */}
        <Link
          to="/guitar-tabs"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          返回吉他谱列表
        </Link>

        {/* 主信息区 */}
        <div className="flex flex-col sm:flex-row gap-6 mb-10">
          {/* 封面 */}
          <div className="shrink-0">
            {coverUrl ? (
              <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border border-border/30 shadow-lg">
                <img
                  src={coverUrl}
                  alt={displayTitle}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl bg-gradient-to-br from-accent/15 via-accent/8 to-muted/10 border border-border/30 flex items-center justify-center">
                <Guitar size={48} className="text-accent/30" />
              </div>
            )}
          </div>

          {/* 详细信息 */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight leading-tight mb-2">
              {displayTitle}
            </h1>

            {tab.artist && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Music2 size={14} />
                <span>{tab.artist}</span>
              </div>
            )}

            {tab.album && (
              <p className="text-xs text-muted-foreground/50 mb-4">
                专辑：{tab.album}
              </p>
            )}

            {/* 元数据标签 */}
            <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground/60 font-mono mb-6">
              {tab.trackCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Layers size={12} />
                  {tab.trackCount} 轨
                </span>
              )}
              {tab.tempo > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} />
                  {tab.tempo} BPM
                </span>
              )}
              {tab.sizeInBytes > 0 && (
                <span className="inline-flex items-center gap-1">
                  <FileText size={12} />
                  {tab.sizeInBytes >= 1048576
                    ? `${(tab.sizeInBytes / 1048576).toFixed(1)} MB`
                    : `${(tab.sizeInBytes / 1024).toFixed(0)} KB`}
                </span>
              )}
            </div>

            {/* 播放按钮 */}
            <button
              onClick={handlePlay}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:bg-accent/90 transition-all hover:shadow-lg hover:shadow-accent/20 active:scale-[0.98] cursor-pointer w-fit"
            >
              <Play size={18} className="ml-0.5" />
              在线播放
            </button>
          </div>
        </div>

        {/* 轨道列表 */}
        {trackNames.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground/50 mb-4">
              轨道列表
            </h2>
            <div className="space-y-1.5">
              {trackNames.map((name, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-muted/20 border border-border/20"
                >
                  <span className="text-[10px] font-mono text-muted-foreground/40 w-5 text-right">
                    {i + 1}
                  </span>
                  <span className="text-sm">{name || `轨道 ${i + 1}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 上传者信息 */}
        {tab.uploaderName && (
          <div className="mb-10 flex items-center gap-3 text-xs text-muted-foreground/50">
            <span className="font-mono uppercase tracking-widest">上传者</span>
            <div className="flex items-center gap-1.5">
              {tab.uploaderImage ? (
                <img
                  src={tab.uploaderImage}
                  alt={tab.uploaderName}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <User size={12} />
              )}
              <span>{tab.uploaderName}</span>
            </div>
          </div>
        )}

        {/* 同首歌其他版本 */}
        {relatedTabs.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground/50 mb-4">
              其他版本
            </h2>
            <div className="space-y-2">
              {relatedTabs.map((related) => (
                <Link
                  key={related.mediaId}
                  to="/guitar-tab/$slug"
                  params={{ slug: related.slug || String(related.mediaId) }}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border/30 bg-card hover:border-accent/40 hover:shadow-sm transition-all group"
                >
                  {/* 封面小图 */}
                  <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-muted/20">
                    {related.coverKey ? (
                      <img
                        src={`/images/${related.coverKey}?w=80&h=80&fit=cover`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Guitar size={16} className="text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">
                      {related.fileName}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50 font-mono mt-0.5">
                      {related.trackCount > 0 && (
                        <span>{related.trackCount} 轨</span>
                      )}
                      {related.tempo > 0 && (
                        <span>{related.tempo} BPM</span>
                      )}
                      {related.sizeInBytes > 0 && (
                        <span>
                          {related.sizeInBytes >= 1048576
                            ? `${(related.sizeInBytes / 1048576).toFixed(1)} MB`
                            : `${(related.sizeInBytes / 1024).toFixed(0)} KB`}
                        </span>
                      )}
                      {related.uploaderName && (
                        <span className="flex items-center gap-0.5">
                          <User size={8} />
                          {related.uploaderName}
                        </span>
                      )}
                    </div>
                  </div>

                  <Play size={16} className="shrink-0 text-muted-foreground/30 group-hover:text-accent transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 文件信息 */}
        <div className="pt-6 border-t border-border/20">
          <p className="text-[10px] font-mono text-muted-foreground/30 uppercase tracking-widest">
            {tab.fileName}
          </p>
        </div>
      </div>

      {/* 全屏播放器 */}
      <GuitarProViewer
        isOpen={viewerOpen}
        fileUrl={fileUrl}
        fileName={displayTitle}
        onClose={handleCloseViewer}
      />
    </div>
  );
}
