import {
  AlertCircle,
  Database,
  Download,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useExportProgress,
  useImportProgress,
  useStartExport,
  useUploadForImport,
} from "@/features/import-export/queries/import-export.queries";
import { getExportDownloadUrl } from "@/features/import-export/import-export.service";

function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-primary transition-all duration-500 ease-in-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function BackupRestoreSection() {
  // --- Export State ---
  const [exportTaskId, setExportTaskId] = useState<string | null>(null);
  const startExport = useStartExport();
  const { data: exportProgress } = useExportProgress(exportTaskId);

  const isExporting =
    exportProgress?.status === "pending" ||
    exportProgress?.status === "processing";
  const exportCompleted = exportProgress?.status === "completed";

  const handleExport = () => {
    startExport.mutate(
      {},
      {
        onSuccess: (result) => {
          setExportTaskId(result.taskId);
          toast.success("备份任务已启动");
        },
        onError: (error) => {
          toast.error("启动失败", { description: error.message });
        },
      },
    );
  };

  const handleDownload = () => {
    if (exportTaskId && exportProgress?.downloadKey) {
      window.open(getExportDownloadUrl(exportTaskId), "_blank");
      if (exportProgress.warnings.length > 0) {
        toast.warning("导出完成（有警告）", {
          description: exportProgress.warnings.join("\n"),
        });
      }
      setTimeout(() => setExportTaskId(null), 2000);
    }
  };

  // --- Import State ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importTaskId, setImportTaskId] = useState<string | null>(null);
  const uploadMutation = useUploadForImport();
  const { data: importProgress } = useImportProgress(importTaskId);

  const isImporting =
    importProgress?.status === "pending" ||
    importProgress?.status === "processing";
  const importCompleted = importProgress?.status === "completed";
  const importFailed = importProgress?.status === "failed";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const formData = new FormData();
    for (const file of fileList) {
      formData.append("file", file);
    }

    uploadMutation.mutate(formData, {
      onSuccess: (result) => {
        setImportTaskId(result.taskId);
        toast.success("导入任务已启动");
      },
      onError: (error) => {
        toast.error("上传失败", { description: error.message });
      },
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Export Card */}
        <div className="group border border-border/30 bg-background/50 p-8 space-y-6 hover:border-border/60 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted/40 rounded-full">
                <Database size={20} className="text-muted-foreground" />
              </div>
              <div>
                <h4 className="text-lg font-serif font-medium text-foreground tracking-tight">
                  全站备份导出
                </h4>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">
                  SYSTEM_EXPORT_JOB
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            将当前系统中所有的文章内容、标签映射、评论记录以及管理的媒体文件完整打包并加密。建议在每次重大内容更新或系统版本升级前执行。
          </p>

          <div className="space-y-6 pt-4">
            <div className="flex gap-4">
              {exportCompleted ? (
                <Button
                  type="button"
                  onClick={handleDownload}
                  className="w-full h-11 px-6 text-[10px] font-mono uppercase tracking-[0.2em] rounded-none gap-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/10"
                >
                  <Download size={14} />[ 下载当前备份 ]
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting || startExport.isPending}
                  className="w-full h-11 px-6 text-[10px] font-mono uppercase tracking-[0.2em] rounded-none gap-3 bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {isExporting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Database size={14} />
                  )}
                  [ {isExporting ? "正在打包数据" : "启动全量备份"} ]
                </Button>
              )}
            </div>

            {exportProgress && isExporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    <Loader2 size={10} className="animate-spin" /> Packing
                    Resources...
                  </span>
                  <span>
                    {exportProgress.total > 0
                      ? Math.round(
                          (exportProgress.completed / exportProgress.total) *
                            100,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    exportProgress.total > 0
                      ? (exportProgress.completed / exportProgress.total) * 100
                      : 0
                  }
                  className="h-1 bg-muted/20"
                />
              </div>
            )}
          </div>
        </div>

        {/* Import Card */}
        <div className="group border border-border/30 bg-background/50 p-8 space-y-6 hover:border-border/60 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted/40 rounded-full">
                <Upload size={20} className="text-muted-foreground" />
              </div>
              <div>
                <h4 className="text-lg font-serif font-medium text-foreground tracking-tight">
                  备份数据恢复
                </h4>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">
                  DATA_RECOVERY_LOADER
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            支持上传 `.zip` 格式的完整备份包，或单个 `.md` Markdown
            文件进行内容迁移。该操作支持增量合并，不会覆盖已有的同名内容标识。
          </p>

          <div className="space-y-6 pt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.md"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="flex gap-4">
              {importCompleted || importFailed ? (
                <Button
                  type="button"
                  onClick={() => setImportTaskId(null)}
                  variant="outline"
                  className="w-full h-11 px-6 text-[10px] font-mono uppercase tracking-[0.15em] rounded-none gap-3 border-border/50 hover:bg-background transition-all"
                >
                  <RefreshCw size={14} />[ 清理状态 ]
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting || uploadMutation.isPending}
                  className="w-full h-11 px-6 text-[10px] font-mono uppercase tracking-[0.2em] rounded-none gap-3 bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {uploadMutation.isPending || isImporting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  [ {uploadMutation.isPending ? "正在传输文件" : "上传备份文件"}{" "}
                  ]
                </Button>
              )}
            </div>

            {importProgress && isImporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    <Loader2 size={10} className="animate-spin" /> Restoring
                    Streams...
                  </span>
                  <span>
                    {importProgress.total > 0
                      ? Math.round(
                          (importProgress.completed / importProgress.total) *
                            100,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    importProgress.total > 0
                      ? (importProgress.completed / importProgress.total) * 100
                      : 0
                  }
                  className="h-1 bg-muted/20"
                />
              </div>
            )}

            {importCompleted && importProgress.report && (
              <div className="p-4 bg-muted/10 border border-border/30 font-mono text-[10px] space-y-2 animate-in fade-in zoom-in-95">
                <div className="text-muted-foreground uppercase tracking-widest pb-2 border-b border-border/20 mb-1">
                  吞吐报告：
                </div>
                <div className="flex justify-between px-1">
                  <span>成功入库资源:</span>
                  <span className="text-emerald-500 font-bold">
                    {importProgress.report.succeeded.length} UNITS
                  </span>
                </div>
                {importProgress.report.failed.length > 0 && (
                  <div className="flex justify-between px-1">
                    <span>处理失败:</span>
                    <span className="text-red-500 font-bold">
                      {importProgress.report.failed.length} ERRORS
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-2 pt-3 border-t border-border/20 mt-2 text-amber-500/80 leading-relaxed italic">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <span>建议重启缓存索引以应用全部更改。</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
