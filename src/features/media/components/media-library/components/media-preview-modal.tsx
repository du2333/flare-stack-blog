import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Calendar,
  Check,
  Copy,
  Disc3,
  Download,
  ExternalLink,
  FileText,
  Guitar,
  HardDrive,
  Headphones,
  Layout,
  Link2,
  Loader2,
  Music,
  Pencil,
  Play,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { MediaAsset } from "@/features/media/components/media-library/types";
import { GuitarProViewer } from "@/features/media/components/guitar-pro-viewer";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLinkedPostsFn } from "@/features/media/media.api";
import { useDelayUnmount } from "@/hooks/use-delay-unmount";
import { cn, formatBytes } from "@/lib/utils";
import { MEDIA_KEYS, guitarTabMetaQuery } from "@/features/media/queries";
import {
  getOptimizedImageUrl,
  isGuitarProFile,
  isVideoFile,
  isAudioFile,
} from "@/features/media/media.utils";

interface MediaPreviewModalProps {
  asset: MediaAsset | null;
  onClose: () => void;
  onUpdateName: (key: string, name: string) => Promise<void>;
  onDelete: (key: string) => Promise<void>;
}

export function MediaPreviewModal({
  asset,
  onClose,
  onUpdateName,
  onDelete,
}: MediaPreviewModalProps) {
  const isMounted = !!asset;
  const shouldRender = useDelayUnmount(isMounted, 200);

  // Persist asset during exit animation
  const [activeAsset, setActiveAsset] = useState<MediaAsset | null>(asset);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [gpViewerOpen, setGpViewerOpen] = useState(false);

  useEffect(() => {
    if (asset) {
      setActiveAsset(asset);
      setEditName(asset.fileName);
      setIsEditing(false);
      setIsDeleting(false);
    }
  }, [asset]);

  const handleSaveName = async () => {
    if (!activeAsset || !editName.trim()) return;

    setIsSaving(true);
    try {
      await onUpdateName(activeAsset.key, editName);
      setActiveAsset((prev) => (prev ? { ...prev, fileName: editName } : null));
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update name:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeAsset) return;

    // Safety check for linked posts handled by parent, but good to have visual feedback
    if (linkedPosts.length > 0) {
      toast.error("无法删除", {
        description: "此资源被文章引用，请先移除引用。",
      });
      return;
    }

    if (!confirm("确定要永久删除此文件吗？")) return;

    setIsDeleting(true);
    try {
      await onDelete(activeAsset.key);
      onClose();
    } catch (error) {
      console.error("Delete failed:", error);
      setIsDeleting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!activeAsset) return;
    try {
      const absoluteUrl = activeAsset.url.startsWith("http")
        ? activeAsset.url
        : `${window.location.origin}${activeAsset.url}`;

      await navigator.clipboard.writeText(absoluteUrl);
      toast.success("链接已复制", {
        description: "图片地址已复制到剪贴板",
      });
    } catch (err) {
      toast.error("复制失败", {
        description: "无法访问剪贴板",
      });
    }
  };

  // Query linked posts via server function
  const { data: linkedPosts = [] } = useQuery({
    queryKey: MEDIA_KEYS.linkedPosts(activeAsset?.key || ""),
    queryFn: async () => {
      if (!activeAsset?.key) return [];
      return getLinkedPostsFn({ data: { key: activeAsset.key } });
    },
    enabled: !!activeAsset?.key,
  });

  // Query guitar tab metadata for GP files
  const isGp = activeAsset ? isGuitarProFile(activeAsset.fileName) : false;
  const { data: gpMeta } = useQuery({
    ...guitarTabMetaQuery(activeAsset?.id ?? 0),
    enabled: isGp && !!activeAsset?.id,
  });

  if (!shouldRender || !activeAsset) return null;

  return (
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center p-4 md:p-8 ${
        isMounted ? "pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-background/95 backdrop-blur-md transition-all duration-500 ${
          isMounted ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className={`absolute top-4 right-4 z-110 text-muted-foreground hover:text-foreground transition-all duration-500 rounded-none h-12 w-12 ${
          isMounted ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
      >
        <X size={24} strokeWidth={1} />
      </Button>

      <div
        className={`
        w-full max-w-6xl h-full md:h-[85vh] flex flex-col md:flex-row bg-background border border-border/30 shadow-none relative overflow-hidden z-10 rounded-none
        ${
          isMounted
            ? "animate-in fade-in zoom-in-95"
            : "animate-out fade-out zoom-out-95"
        } duration-500
      `}
      >
        {/* --- Image Viewport (Left/Top) --- */}
        <div className="h-[40vh] md:h-auto md:w-2/3 bg-muted/5 relative flex items-center justify-center overflow-hidden p-8 md:p-12 border-b md:border-b-0 md:border-r border-border/30">
          <div className="absolute top-4 left-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest z-20">
            预览模式
          </div>
          {activeAsset.mimeType.startsWith("image/") ? (
            <img
              src={activeAsset.url}
              alt={activeAsset.fileName}
              className="max-w-full max-h-full object-contain relative z-10 shadow-sm"
            />
          ) : isGuitarProFile(activeAsset.fileName) ? (
            <div className="flex flex-col items-center justify-center gap-6 text-muted-foreground">
              {gpMeta?.coverKey ? (
                <div className="relative w-48 h-48 md:w-56 md:h-56 shadow-lg border border-border/30 overflow-hidden">
                  <img
                    src={getOptimizedImageUrl(gpMeta.coverKey, 400)}
                    alt={gpMeta.title ?? activeAsset.fileName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <Guitar size={64} strokeWidth={1} className="opacity-40" />
              )}
              <div className="text-center space-y-2">
                {gpMeta?.title ? (
                  <>
                    <p className="text-base font-mono font-medium text-foreground">
                      {gpMeta.title}
                    </p>
                    {gpMeta.artist && (
                      <p className="text-xs font-mono text-muted-foreground">
                        {gpMeta.artist}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-mono font-medium text-foreground">
                    {activeAsset.fileName}
                  </p>
                )}
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-60">
                  Guitar Pro 吉他谱文件
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setGpViewerOpen(true)}
                  className="rounded-none gap-2 font-mono text-xs uppercase tracking-wider"
                >
                  <Play size={14} />
                  播放吉他谱
                </Button>
                <a
                  href={activeAsset.url}
                  download={activeAsset.fileName}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "rounded-none gap-2 font-mono text-xs uppercase tracking-wider",
                  )}
                >
                  <Download size={14} />
                  下载文件
                </a>
              </div>
            </div>
          ) : isVideoFile(activeAsset.fileName) ? (
            <div className="flex flex-col items-center justify-center gap-4 w-full max-w-2xl">
              <video
                src={`${activeAsset.url}?original=true`}
                controls
                className="max-w-full max-h-[50vh] rounded-none border border-border/30"
              >
                您的浏览器不支持视频播放
              </video>
              <div className="text-center space-y-1">
                <p className="text-sm font-mono font-medium text-foreground">
                  {activeAsset.fileName}
                </p>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground opacity-60">
                  视频文件
                </p>
              </div>
            </div>
          ) : isAudioFile(activeAsset.fileName) ? (
            <div className="flex flex-col items-center justify-center gap-6 text-muted-foreground">
              <Headphones size={64} strokeWidth={1} className="opacity-40" />
              <div className="text-center space-y-2">
                <p className="text-sm font-mono font-medium text-foreground">
                  {activeAsset.fileName}
                </p>
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-60">
                  音频文件
                </p>
              </div>
              <audio
                src={`${activeAsset.url}?original=true`}
                controls
                className="w-full max-w-md"
              >
                您的浏览器不支持音频播放
              </audio>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <FileText size={48} strokeWidth={1} className="opacity-40" />
              <p className="text-[10px] font-mono uppercase tracking-widest">
                无法预览此文件
              </p>
            </div>
          )}
        </div>

        {/* --- Metadata Sidebar (Right/Bottom) --- */}
        <div className="flex-1 md:w-1/3 flex flex-col min-h-0 bg-background">
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-border/30">
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.3em] mb-4">
              资产详情
            </div>

            {isEditing ? (
              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 h-9 text-sm font-mono bg-muted/10 border-b border-border/50 rounded-none px-0 focus:border-foreground focus:ring-0"
                  autoFocus
                />
                <Button
                  onClick={handleSaveName}
                  disabled={isSaving}
                  variant="default"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-none"
                >
                  {isSaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                </Button>
                <Button
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-500 rounded-none"
                >
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <div className="flex justify-between items-start gap-4 group/edit">
                <h2 className="text-xl font-serif font-medium tracking-tight break-all leading-snug">
                  {activeAsset.fileName}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover/edit:opacity-100 rounded-none"
                >
                  <Pencil size={12} />
                </Button>
              </div>
            )}
          </div>

          {/* Details List */}
          <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar">
            {/* Guitar Tab Metadata Section */}
            {isGp && gpMeta && (
              <div className="space-y-4 pb-6 border-b border-border/30">
                <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                  <Guitar size={10} /> 吉他谱信息
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                  {gpMeta.title && (
                    <div className="space-y-1 col-span-2">
                      <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                        <Music size={10} /> 曲名
                      </div>
                      <div className="text-xs font-mono font-medium">
                        {gpMeta.title}
                      </div>
                    </div>
                  )}
                  {gpMeta.artist && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                        <User size={10} /> 艺术家
                      </div>
                      <div className="text-xs font-mono font-medium">
                        {gpMeta.artist}
                      </div>
                    </div>
                  )}
                  {gpMeta.album && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                        <Disc3 size={10} /> 专辑
                      </div>
                      <div className="text-xs font-mono font-medium">
                        {gpMeta.album}
                      </div>
                    </div>
                  )}
                  {gpMeta.tempo && (
                    <div className="space-y-1">
                      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                        BPM
                      </div>
                      <div className="text-xs font-mono font-medium">
                        {gpMeta.tempo}
                      </div>
                    </div>
                  )}
                  {gpMeta.trackCount && (
                    <div className="space-y-1">
                      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                        音轨数
                      </div>
                      <div className="text-xs font-mono font-medium">
                        {gpMeta.trackCount}
                      </div>
                    </div>
                  )}
                </div>
                {gpMeta.trackNames && (
                  <div className="space-y-2">
                    <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                      音轨列表
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {gpMeta.trackNames.split(",").map((name, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-muted/20 border border-border/30 text-[9px] font-mono"
                        >
                          {name.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                  <HardDrive size={10} /> 大小
                </div>
                <div className="text-xs font-mono font-medium">
                  {formatBytes(activeAsset.sizeInBytes)}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                  <FileText size={10} /> 格式
                </div>
                <div className="text-xs font-mono font-medium uppercase">
                  {activeAsset.mimeType.split("/")[1]}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                  <Layout size={10} /> 尺寸
                </div>
                <div className="text-xs font-mono font-medium uppercase">
                  {activeAsset.width && activeAsset.height
                    ? `${activeAsset.width} × ${activeAsset.height}`
                    : "未知"}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                  <Calendar size={10} /> 创建时间
                </div>
                <div className="text-xs font-mono font-medium uppercase">
                  {new Date(activeAsset.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Linked Posts Section */}
            <div className="pt-6 border-t border-border/30">
              <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
                <Link2 size={10} /> 引用 ({linkedPosts.length})
              </div>
              {linkedPosts.length === 0 ? (
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider pl-4 border-l border-border/30">
                  未找到引用
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedPosts.map((post) => (
                    <Link
                      key={post.id}
                      to="/admin/posts/edit/$id"
                      params={{ id: String(post.id) }}
                      className="block p-3 bg-muted/10 hover:bg-accent/10 border border-transparent hover:border-border/30 transition-all rounded-none group"
                    >
                      <div className="text-[10px] font-medium truncate mb-1 flex items-center justify-between">
                        {post.title}
                        <ExternalLink
                          size={10}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                        /{post.slug}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-6 border-t border-border/30">
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                资产键
              </div>
              <div className="p-3 bg-muted/10 text-[9px] font-mono text-muted-foreground break-all rounded-none leading-relaxed select-all border border-border/30">
                {activeAsset.key}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 md:p-8 border-t border-border/30 bg-background flex flex-col gap-3">
            <div className="flex gap-3">
              <a
                href={`${activeAsset.url}?original=true`}
                download={activeAsset.fileName}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "flex-1 h-10 text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-foreground hover:text-background transition-all rounded-none gap-2 flex items-center justify-center whitespace-nowrap border-foreground/20",
                )}
              >
                <Download size={12} className="shrink-0" />
                <span>[ 下载 ]</span>
              </a>

              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="flex-1 h-10 text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-foreground hover:text-background transition-all rounded-none gap-2 border-foreground/20"
              >
                <Copy size={12} className="shrink-0" />
                <span>[ 复制链接 ]</span>
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={isDeleting || linkedPosts.length > 0}
              className="w-full h-10 text-[10px] uppercase tracking-[0.2em] font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-all rounded-none gap-2"
            >
              {isDeleting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Trash2 size={12} />
              )}
              <span>[ 永久删除 ]</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Guitar Pro 查看器 */}
      {isGuitarProFile(activeAsset.fileName) && (
        <GuitarProViewer
          isOpen={gpViewerOpen}
          fileUrl={`${activeAsset.url}?original=true`}
          fileName={activeAsset.fileName}
          onClose={() => setGpViewerOpen(false)}
        />
      )}
    </div>
  );
}
