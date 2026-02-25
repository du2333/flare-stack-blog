import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Eye,
  FileText,
  Guitar,
  Layers,
  Loader2,
  Mail,
  Music2,
  User,
  XCircle,
} from "lucide-react";
import { useCallback, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  fetchMissingCoversFn,
  getGuitarTabsAdminFn,
  reviewGuitarTabFn,
} from "@/features/media/media.api";
import { GuitarProViewer } from "@/features/media/components/guitar-pro-viewer";
import { Button } from "@/components/ui/button";
import type { GuitarTabWithMeta } from "@/features/media/data/media.data";

const searchSchema = z.object({
  status: z
    .enum(["pending", "approved", "rejected", "ALL"])
    .optional()
    .default("pending")
    .catch("pending"),
});

export const Route = createFileRoute("/admin/guitar-tabs/")({
  validateSearch: searchSchema,
  component: GuitarTabsAdminPage,
  loader: () => ({ title: "吉他谱审核" }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
});

const GUITAR_TABS_ADMIN_KEY = ["admin", "guitar-tabs"] as const;

function GuitarTabsAdminPage() {
  const { status } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  // 预览状态
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    fileName: string;
  } | null>(null);

  // 拒绝原因弹窗
  const [rejectTarget, setRejectTarget] = useState<GuitarTabWithMeta | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handlePreview = useCallback((tab: GuitarTabWithMeta) => {
    const fileUrl = `/images/${tab.key}?original=true`;
    setPreviewFile({ url: fileUrl, fileName: tab.fileName });
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewFile(null);
  }, []);

  const statusFilter =
    status === "ALL" ? undefined : (status as "pending" | "approved" | "rejected");

  const { data, isLoading } = useQuery({
    queryKey: [...GUITAR_TABS_ADMIN_KEY, statusFilter],
    queryFn: () =>
      getGuitarTabsAdminFn({
        data: { status: statusFilter, limit: 100 },
      }),
  });

  const approveMutation = useMutation({
    mutationFn: (mediaId: number) =>
      reviewGuitarTabFn({ data: { mediaId, status: "approved" } }),
    onSuccess: () => {
      toast.success("已通过审核");
      queryClient.invalidateQueries({ queryKey: GUITAR_TABS_ADMIN_KEY });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "操作失败");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ mediaId, reason }: { mediaId: number; reason?: string }) =>
      reviewGuitarTabFn({ data: { mediaId, status: "rejected", rejectionReason: reason } }),
    onSuccess: () => {
      toast.success("已拒绝");
      queryClient.invalidateQueries({ queryKey: GUITAR_TABS_ADMIN_KEY });
      setRejectTarget(null);
      setRejectReason("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "操作失败");
    },
  });

  const fetchCoverMutation = useMutation({
    mutationFn: () => fetchMissingCoversFn(),
    onSuccess: (result) => {
      toast.success(`封面获取完成：${result.fetched}/${result.total} 成功`);
      queryClient.invalidateQueries({ queryKey: GUITAR_TABS_ADMIN_KEY });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "获取封面失败");
    },
  });

  const tabs = [
    { key: "pending", label: "待审核" },
    { key: "approved", label: "已通过" },
    { key: "rejected", label: "已拒绝" },
    { key: "ALL", label: "全部" },
  ];

  const items = data?.items ?? [];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Guitar Pro 预览 */}
      <GuitarProViewer
        isOpen={!!previewFile}
        fileUrl={previewFile?.url ?? ""}
        fileName={previewFile?.fileName ?? ""}
        onClose={handleClosePreview}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-border/30 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground">
            吉他谱审核
          </h1>
          <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
            GUITAR_TABS_REVIEW
          </p>
        </div>
        <Button
          onClick={() => fetchCoverMutation.mutate()}
          disabled={fetchCoverMutation.isPending}
          variant="outline"
          size="sm"
          className="rounded-none font-mono text-[10px] uppercase tracking-widest h-8 px-3"
        >
          {fetchCoverMutation.isPending ? (
            <Loader2 size={12} className="animate-spin mr-1.5" />
          ) : (
            <Download size={12} className="mr-1.5" />
          )}
          获取缺失封面
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 border-b border-border/30">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() =>
              navigate({
                search: { status: tab.key as typeof status },
              })
            }
            className={`px-4 py-2.5 text-xs font-mono uppercase tracking-widest transition-colors cursor-pointer border-b-2 -mb-px ${
              (status || "pending") === tab.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Guitar
            size={32}
            className="text-muted-foreground/20 mb-4"
          />
          <p className="text-sm text-muted-foreground/60">
            暂无{statusFilter === "pending" ? "待审核" : ""}吉他谱
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((tab) => (
            <GuitarTabReviewCard
              key={tab.id}
              tab={tab}
              onApprove={() => approveMutation.mutate(tab.id)}
              onReject={() => setRejectTarget(tab)}
              onPreview={() => handlePreview(tab)}
              isApproving={
                approveMutation.isPending &&
                approveMutation.variables === tab.id
              }
              isRejecting={
                rejectMutation.isPending &&
                rejectMutation.variables?.mediaId === tab.id
              }
            />
          ))}
        </div>
      )}

      {/* 拒绝原因弹窗 */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-border/40 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="space-y-1">
              <h3 className="text-lg font-serif font-medium">拒绝吉他谱</h3>
              <p className="text-xs text-muted-foreground">
                {rejectTarget.title || rejectTarget.fileName}
                {rejectTarget.artist && ` — ${rejectTarget.artist}`}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                拒绝原因（将发送至投稿者邮箱）
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请填写拒绝原因，例如：文件损坏、内容不符合要求等"
                className="w-full h-28 px-3 py-2 rounded-lg border border-border/40 bg-muted/10 text-sm resize-none focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 placeholder:text-muted-foreground/40"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-none font-mono text-[10px] uppercase tracking-widest h-9 px-4"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
              >
                取消
              </Button>
              <Button
                size="sm"
                disabled={rejectMutation.isPending}
                className="rounded-none bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] uppercase tracking-widest h-9 px-4"
                onClick={() =>
                  rejectMutation.mutate({
                    mediaId: rejectTarget.id,
                    reason: rejectReason.trim() || undefined,
                  })
                }
              >
                {rejectMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin mr-1.5" />
                ) : (
                  <XCircle size={12} className="mr-1.5" />
                )}
                确认拒绝
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GuitarTabReviewCard({
  tab,
  onApprove,
  onReject,
  onPreview,
  isApproving,
  isRejecting,
}: {
  tab: GuitarTabWithMeta;
  onApprove: () => void;
  onReject: () => void;
  onPreview: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayTitle = tab.title || tab.fileName;
  const coverUrl = tab.coverKey
    ? `/images/${tab.coverKey}?w=120&h=120&fit=cover`
    : null;

  return (
    <div className="rounded-xl border border-border/30 bg-card overflow-hidden">
      {/* 摘要行 */}
      <div className="flex items-center gap-4 p-4">
        {/* 封面缩略图 */}
        <div className="shrink-0">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={displayTitle}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-muted/30 flex items-center justify-center">
              <Guitar size={20} className="text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* 基本信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium truncate">{displayTitle}</h3>
            <StatusBadge status={tab.status} />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60 mt-0.5">
            {tab.artist && (
              <span className="flex items-center gap-1">
                <Music2 size={10} />
                {tab.artist}
              </span>
            )}
            {tab.album && (
              <>
                <span className="text-muted-foreground/20">·</span>
                <span>{tab.album}</span>
              </>
            )}
            {tab.trackCount && tab.trackCount > 0 && (
              <>
                <span className="text-muted-foreground/20">·</span>
                <span className="flex items-center gap-0.5">
                  <Layers size={9} />
                  {tab.trackCount} 轨
                </span>
              </>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => setExpanded(!expanded)}
            size="sm"
            variant="ghost"
            className="rounded-none font-mono text-[10px] uppercase tracking-widest h-8 px-2"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>

          <Button
            onClick={onPreview}
            size="sm"
            variant="outline"
            className="rounded-none font-mono text-[10px] uppercase tracking-widest h-8 px-3"
          >
            <Eye size={12} className="mr-1" />
            预览
          </Button>

          {tab.status === "pending" && (
            <>
              <Button
                onClick={onApprove}
                disabled={isApproving || isRejecting}
                size="sm"
                className="rounded-none bg-green-600 hover:bg-green-700 text-white font-mono text-[10px] uppercase tracking-widest h-8 px-3"
              >
                {isApproving ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <CheckCircle size={12} className="mr-1" />
                )}
                通过
              </Button>
              <Button
                onClick={onReject}
                disabled={isApproving || isRejecting}
                size="sm"
                variant="outline"
                className="rounded-none border-red-500/30 text-red-500 hover:bg-red-500/10 font-mono text-[10px] uppercase tracking-widest h-8 px-3"
              >
                {isRejecting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <XCircle size={12} className="mr-1" />
                )}
                拒绝
              </Button>
            </>
          )}

          {tab.status === "rejected" && (
            <Button
              onClick={onApprove}
              disabled={isApproving}
              size="sm"
              variant="outline"
              className="rounded-none font-mono text-[10px] uppercase tracking-widest h-8 px-3"
            >
              {isApproving ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <CheckCircle size={12} className="mr-1" />
              )}
              改为通过
            </Button>
          )}

          {tab.status === "approved" && (
            <Button
              onClick={onReject}
              disabled={isRejecting}
              size="sm"
              variant="outline"
              className="rounded-none border-red-500/30 text-red-500 hover:bg-red-500/10 font-mono text-[10px] uppercase tracking-widest h-8 px-3"
            >
              {isRejecting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <XCircle size={12} className="mr-1" />
              )}
              下架
            </Button>
          )}
        </div>
      </div>

      {/* 展开详情 */}
      {expanded && <GuitarTabDetailPanel tab={tab} />}
    </div>
  );
}

function GuitarTabDetailPanel({ tab }: { tab: GuitarTabWithMeta }) {
  const coverUrl = tab.coverKey
    ? `/images/${tab.coverKey}?w=300&h=300&fit=cover`
    : null;

  // 解析轨道名称
  let trackNames: string[] = [];
  try {
    trackNames = JSON.parse(tab.trackNames || "[]");
  } catch {
    // ignore
  }

  return (
    <div className="border-t border-border/20 px-5 py-5 bg-muted/5 animate-in slide-in-from-top-2 duration-200">
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
        {/* 左侧：封面大图 */}
        <div>
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={tab.title || tab.fileName}
              className="w-full max-w-[200px] aspect-square rounded-xl object-cover border border-border/30"
            />
          ) : (
            <div className="w-full max-w-[200px] aspect-square rounded-xl bg-gradient-to-br from-accent/15 via-accent/8 to-muted/10 border border-border/30 flex items-center justify-center">
              <Guitar size={48} className="text-accent/30" />
            </div>
          )}
        </div>

        {/* 右侧：详细元数据 */}
        <div className="space-y-4">
          {/* 元数据网格 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetaField label="歌曲名" value={tab.title} />
            <MetaField label="艺术家" value={tab.artist} />
            <MetaField label="专辑" value={tab.album} />
            <MetaField
              label="轨道数"
              value={tab.trackCount ? `${tab.trackCount} 轨` : null}
              icon={<Layers size={10} />}
            />
            <MetaField
              label="速度"
              value={tab.tempo ? `${tab.tempo} BPM` : null}
              icon={<Clock size={10} />}
            />
            <MetaField
              label="文件大小"
              value={
                tab.sizeInBytes > 0
                  ? tab.sizeInBytes >= 1048576
                    ? `${(tab.sizeInBytes / 1048576).toFixed(1)} MB`
                    : `${(tab.sizeInBytes / 1024).toFixed(0)} KB`
                  : null
              }
              icon={<FileText size={10} />}
            />
          </div>

          {/* 文件名 */}
          <div className="text-[10px] font-mono text-muted-foreground/40">
            文件：{tab.fileName}
          </div>

          {/* Slug / 独立 URL */}
          {tab.slug && (
            <div className="text-[10px] font-mono text-muted-foreground/40">
              URL：/guitar-tab/{tab.slug}
            </div>
          )}

          {/* 上传者信息 */}
          {tab.uploaderName && (
            <div className="flex items-center gap-3 pt-2 border-t border-border/15">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">
                上传者
              </span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                {tab.uploaderImage ? (
                  <img src={tab.uploaderImage} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <User size={12} />
                )}
                <span>{tab.uploaderName}</span>
                {tab.uploaderEmail && (
                  <span className="flex items-center gap-1 text-muted-foreground/40">
                    <Mail size={9} />
                    {tab.uploaderEmail}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 轨道列表 */}
          {trackNames.length > 0 && (
            <div className="pt-2 border-t border-border/15">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-2">
                轨道列表
              </p>
              <div className="flex flex-wrap gap-1.5">
                {trackNames.map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/20 border border-border/20 text-[10px] font-mono"
                  >
                    <span className="text-muted-foreground/30">{i + 1}.</span>
                    {name || `Track ${i + 1}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 创建时间 */}
          <div className="text-[10px] font-mono text-muted-foreground/30">
            上传于 {new Date(tab.createdAt).toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40">
        {label}
      </p>
      <p className="text-xs text-foreground/80 flex items-center gap-1">
        {icon}
        {value || <span className="text-muted-foreground/30">—</span>}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; icon: typeof Clock; style: string }> = {
    pending: {
      label: "待审核",
      icon: Clock,
      style: "text-amber-500 border-amber-500/30",
    },
    approved: {
      label: "已通过",
      icon: CheckCircle,
      style: "text-green-600 border-green-600/30",
    },
    rejected: {
      label: "已拒绝",
      icon: XCircle,
      style: "text-red-500 border-red-500/30",
    },
  };

  const c = config[status] ?? {
    label: status,
    icon: Clock,
    style: "text-muted-foreground border-border",
  };
  const Icon = c.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 border ${c.style}`}
    >
      <Icon size={8} />
      {c.label}
    </span>
  );
}
