import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  Guitar,
  Loader2,
  Terminal,
  Upload,
  XCircle,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { submitGuitarTabFn } from "@/features/media/media.api";
import { myGuitarTabsQuery } from "@/features/media/queries";
import {
  GUITAR_PRO_EXTENSIONS,
  MAX_FILE_SIZE_BY_CATEGORY,
} from "@/features/media/media.schema";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { MEDIA_KEYS } from "@/features/media/queries";

export const Route = createFileRoute("/_user/submit-guitar-tab")({
  component: SubmitGuitarTabRoute,
  loader: async () => ({
    title: "投稿吉他谱",
  }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
});

function SubmitGuitarTabRoute() {
  const { data: myTabs } = useQuery(myGuitarTabsQuery());
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleUpload = useCallback(
    async (file: File) => {
      // 验证文件类型
      const ext = file.name
        .toLowerCase()
        .slice(file.name.lastIndexOf("."));
      if (!GUITAR_PRO_EXTENSIONS.includes(ext)) {
        toast.error("只支持 Guitar Pro 文件格式 (GP3/GP4/GP5/GPX/GP)");
        return;
      }

      const maxSize = MAX_FILE_SIZE_BY_CATEGORY["guitar-pro"];
      if (file.size > maxSize) {
        toast.error("文件过大，最大支持 50MB");
        return;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        await submitGuitarTabFn({ data: formData });
        toast.success("提交成功！曲谱将在管理员审核通过后展示。");
        await queryClient.invalidateQueries({
          queryKey: MEDIA_KEYS.myGuitarTabs,
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "提交失败，请稍后重试",
        );
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [queryClient],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  // 拖拽处理
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-6 md:px-0 py-12 md:py-20 space-y-20">
      {/* 标题 */}
      <header className="space-y-8">
        <div className="flex justify-between items-start">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-foreground">
              投稿吉他谱
            </h1>
            <div className="space-y-4 max-w-2xl text-base md:text-lg text-muted-foreground font-light leading-relaxed">
              <p>上传你的 Guitar Pro 文件，审核通过后将展示在吉他谱页面。</p>
              <p className="text-sm text-muted-foreground/60">
                支持格式: GP3 / GP4 / GP5 / GPX / GP，最大 50MB
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/guitar-tabs"
              className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <Terminal size={14} />
              cd /guitar-tabs
            </Link>
          </div>
        </div>
      </header>

      <div className="w-full h-px bg-border/40" />

      {/* 上传区域 */}
      <section className="space-y-8">
        <h3 className="text-lg font-serif font-medium text-foreground">
          上传文件
        </h3>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
            isDragging
              ? "border-accent bg-accent/5"
              : "border-border/40 hover:border-accent/40 bg-muted/10"
          } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".gp3,.gp4,.gp5,.gpx,.gp"
            onChange={handleFileChange}
            className="hidden"
          />

          {isUploading ? (
            <>
              <Loader2
                size={32}
                className="animate-spin text-accent mb-4"
              />
              <p className="text-sm text-muted-foreground">
                正在上传并解析...
              </p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <Upload size={24} className="text-accent/70" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                点击选择文件或拖拽到此处
              </p>
              <p className="text-xs text-muted-foreground/60">
                文件将自动解析曲目信息，审核通过后展示
              </p>
            </>
          )}
        </div>
      </section>

      {/* 我的投稿记录 */}
      {myTabs && myTabs.length > 0 && (
        <>
          <div className="w-full h-px bg-border/40" />

          <section className="space-y-8">
            <h3 className="text-lg font-serif font-medium text-foreground">
              我的投稿
            </h3>
            <div className="space-y-4">
              {myTabs.map((tab) => (
                <div
                  key={tab.id}
                  className="flex items-start justify-between py-4 border-b border-border/30"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Guitar
                        size={14}
                        className="text-accent/50 shrink-0"
                      />
                      <span className="text-sm font-serif font-medium truncate">
                        {tab.title || tab.fileName}
                      </span>
                      <GuitarTabStatusBadge status={tab.status} />
                    </div>
                    {tab.artist && (
                      <p className="text-xs text-muted-foreground/60 ml-5">
                        {tab.artist}
                      </p>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground shrink-0 ml-4">
                    {formatDate(tab.createdAt).split(" ")[0]}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function GuitarTabStatusBadge({
  status,
}: {
  status: "pending" | "approved" | "rejected";
}) {
  const config = {
    pending: {
      label: "审核中",
      icon: Clock,
      style: "text-amber-500 border-amber-500/30",
    },
    approved: {
      label: "已通过",
      icon: CheckCircle2,
      style: "text-green-600 border-green-600/30",
    },
    rejected: {
      label: "未通过",
      icon: XCircle,
      style: "text-red-500 border-red-500/30",
    },
  };

  const { label, icon: Icon, style } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 border ${style}`}
    >
      <Icon size={8} />
      {label}
    </span>
  );
}
