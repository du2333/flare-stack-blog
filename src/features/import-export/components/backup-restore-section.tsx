import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Info,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useExportProgress,
  useImportProgress,
  useStartExport,
  useUploadForImport,
} from "@/features/import-export/queries/import-export.queries";
import { getExportDownloadUrl } from "@/features/import-export/import-export.service";
import { ms } from "@/lib/duration";

const EXPORT_TOAST_ID = "export-progress";
const IMPORT_TOAST_ID = "import-progress";

function ImportToastResult({
  succeeded,
  failed,
  warnings,
}: {
  succeeded: Array<{ title: string; slug: string }>;
  failed: Array<{ title: string; reason: string }>;
  warnings: Array<string>;
}) {
  const hasSuccess = succeeded.length > 0;
  const hasFailure = failed.length > 0;
  const hasWarning = warnings.length > 0;

  if (!hasSuccess && !hasFailure && !hasWarning) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-1">
        <Info size={14} />
        <span>没有找到可导入的内容</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-2.5">
      {hasSuccess && (
        <div className="border-l-2 border-emerald-500 pl-3.5 py-0.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            <CheckCircle2 size={13} strokeWidth={2.5} />
            <span>成功导入 {succeeded.length} 篇</span>
          </div>
          <ul className="grid gap-1">
            {succeeded.slice(0, 3).map((p) => (
              <li
                key={p.slug}
                className="text-[11px] text-muted-foreground/90 truncate leading-relaxed"
              >
                {p.title}
                <span className="opacity-40 font-mono ml-1.5 text-[9px]">
                  /{p.slug}
                </span>
              </li>
            ))}
            {succeeded.length > 3 && (
              <li className="text-[10px] text-muted-foreground/40 italic font-medium">
                + 其余 {succeeded.length - 3} 篇文章
              </li>
            )}
          </ul>
        </div>
      )}

      {hasFailure && (
        <div className="border-l-2 border-red-500 pl-3.5 py-0.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-red-500 font-semibold text-xs uppercase tracking-wider">
            <XCircle size={13} strokeWidth={2.5} />
            <span>失败 {failed.length} 篇</span>
          </div>
          <ul className="grid gap-1">
            {failed.slice(0, 3).map((p) => (
              <li
                key={p.title}
                className="text-[11px] text-muted-foreground/90 truncate leading-relaxed"
              >
                {p.title}
                <span className="text-red-400/50 font-medium ml-1.5 italic">
                  — {p.reason}
                </span>
              </li>
            ))}
            {failed.length > 3 && (
              <li className="text-[10px] text-muted-foreground/40 italic font-medium">
                + 其余 {failed.length - 3} 篇
              </li>
            )}
          </ul>
        </div>
      )}

      {hasWarning && (
        <div className="border-l-2 border-amber-500 pl-3.5 py-0.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 font-semibold text-xs uppercase tracking-wider">
            <AlertTriangle size={13} strokeWidth={2.5} />
            <span>提示 {warnings.length} 条</span>
          </div>
          <ul className="grid gap-1">
            {warnings.slice(0, 3).map((w, i) => (
              <li
                key={i}
                className="text-[11px] text-muted-foreground/90 leading-relaxed italic"
              >
                {w}
              </li>
            ))}
            {warnings.length > 3 && (
              <li className="text-[10px] text-muted-foreground/40 italic font-medium">
                + 其余 {warnings.length - 3} 条提醒
              </li>
            )}
          </ul>
        </div>
      )}

      {hasSuccess && (
        <div className="pt-3 border-t border-border/10">
          <div className="flex items-start gap-2 text-muted-foreground/60 leading-snug">
            <Info size={12} className="shrink-0 mt-0.5" />
            <p className="text-[10px] italic">
              建议重置系统缓存以确保最新内容在首页立即生效。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function BackupRestoreSection() {
  // --- Export State ---
  const [exportTaskId, setExportTaskId] = useState<string | null>(null);
  const startExport = useStartExport();
  const { data: exportProgress } = useExportProgress(exportTaskId);
  const exportProgressData = exportProgress?.error
    ? null
    : exportProgress?.data;

  const isExporting =
    exportTaskId !== null ||
    exportProgressData?.status === "pending" ||
    exportProgressData?.status === "processing";

  const handleExport = () => {
    startExport.mutate(
      {},
      {
        onSuccess: (result) => {
          if (result.error) {
            const reason = result.error.reason;
            switch (reason) {
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              case "WORKFLOW_CREATE_FAILED":
                toast.error("启动失败", { description: "启动导出任务失败" });
                return;
              default: {
                reason satisfies never;
                toast.error("启动失败", { description: "未知错误" });
                return;
              }
            }
          }
          setExportTaskId(result.data.taskId);
        },
      },
    );
  };

  // Export completion toast
  useEffect(() => {
    if (!exportTaskId || !exportProgress) return;

    if (exportProgress.error) {
      const reason = exportProgress.error.reason;
      switch (reason) {
        case "TASK_NOT_FOUND":
          // KV eventual consistency: keep polling
          return;
        case "INVALID_PROGRESS_DATA":
          toast.error("导出失败", {
            id: EXPORT_TOAST_ID,
            duration: ms("10s"),
            description: "导出进度数据异常，请重试",
          });
          setExportTaskId(null);
          return;
        default: {
          reason satisfies never;
          return;
        }
      }
    }

    const { status, total } = exportProgress.data;

    if (status === "completed") {
      const currentTaskId = exportTaskId;
      toast.success("导出完成", {
        id: EXPORT_TOAST_ID,
        duration: ms("10s"),
        description: `共 ${total} 篇文章已打包完成`,
        action: {
          label: "下载",
          onClick: () =>
            window.open(getExportDownloadUrl(currentTaskId), "_blank"),
        },
      });
      setExportTaskId(null);
    } else if (status === "failed") {
      toast.error("导出失败", {
        id: EXPORT_TOAST_ID,
        duration: ms("10s"),
        description: "任务异常中断，请重试",
      });
      setExportTaskId(null);
    }
  }, [exportProgress, exportTaskId]);

  // --- Import State ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importTaskId, setImportTaskId] = useState<string | null>(null);
  const uploadMutation = useUploadForImport();
  const { data: importProgress } = useImportProgress(importTaskId);
  const importProgressData = importProgress?.error
    ? null
    : importProgress?.data;

  const isImporting =
    importTaskId !== null ||
    importProgressData?.status === "pending" ||
    importProgressData?.status === "processing";

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
        if (result.error) {
          const reason = result.error.reason;
          switch (reason) {
            case "NO_FILES":
              toast.error("上传失败", { description: "缺少文件" });
              return;
            case "UPLOAD_FAILED":
              toast.error("上传失败", { description: "上传文件失败，请重试" });
              return;
            case "WORKFLOW_CREATE_FAILED":
              toast.error("上传失败", { description: "启动导入任务失败" });
              return;
            default: {
              reason satisfies never;
              toast.error("上传失败", { description: "未知错误" });
              return;
            }
          }
        }
        setImportTaskId(result.data.taskId);
      },
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Import completion toast
  useEffect(() => {
    if (!importTaskId || !importProgress) return;

    if (importProgress.error) {
      const reason = importProgress.error.reason;
      switch (reason) {
        case "TASK_NOT_FOUND":
          // KV eventual consistency: keep polling
          return;
        case "INVALID_PROGRESS_DATA":
          toast.error("导入失败", {
            id: IMPORT_TOAST_ID,
            duration: ms("10s"),
            description: "导入进度数据异常，请重试",
          });
          setImportTaskId(null);
          return;
        default: {
          reason satisfies never;
          return;
        }
      }
    }

    const { status, report } = importProgress.data;

    if (status === "completed") {
      const succeeded = report?.succeeded ?? [];
      const failed = report?.failed ?? [];
      const warnings = report?.warnings ?? [];

      (failed.length > 0 ? toast.warning : toast.success)("导入完成", {
        id: IMPORT_TOAST_ID,
        duration: ms("10s"),
        description: (
          <ImportToastResult
            succeeded={succeeded}
            failed={failed}
            warnings={warnings}
          />
        ),
      });
      setImportTaskId(null);
    } else if (status === "failed") {
      toast.error("导入失败", {
        id: IMPORT_TOAST_ID,
        duration: ms("10s"),
        description: "任务异常中断，请检查文件格式后重试",
      });
      setImportTaskId(null);
    }
  }, [importProgress, importTaskId]);

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <div className="space-y-6 border border-border/30 bg-background/50 p-8">
          <div className="flex items-center gap-4">
            <div className="rounded-sm bg-muted/40 p-3">
              <Database size={20} className="text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-serif font-medium text-foreground tracking-tight">
                全站备份导出
              </h4>
              <p className="text-sm text-muted-foreground">
                打包文章、评论、标签和媒体文件。
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            将当前系统中所有的文章内容、标签映射、评论记录以及管理的媒体文件完整打包并加密。建议在每次重大内容更新或系统版本升级前执行。
          </p>

          <div className="space-y-6 pt-4">
            <div className="flex gap-4">
              <Button
                type="button"
                onClick={handleExport}
                disabled={isExporting || startExport.isPending}
                className="h-11 w-full gap-3 rounded-none bg-foreground px-6 font-mono text-[10px] uppercase tracking-[0.2em] text-background transition-all hover:opacity-90 disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Database size={14} />
                )}
                {isExporting ? "正在打包数据" : "开始备份"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6 border border-border/30 bg-background/50 p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-sm bg-muted/40 p-3">
              <Upload size={20} className="text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-serif font-medium text-foreground tracking-tight">
                  备份数据恢复
                </h4>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                    >
                      <Info size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="w-80 space-y-3 whitespace-normal p-4 font-sans leading-relaxed tracking-normal normal-case">
                    <div className="space-y-3">
                      <p className="border-b border-border/20 pb-1 text-xs font-bold">
                        支持格式与导入规范
                      </p>
                      <ul className="list-disc space-y-2 pl-4 text-[10px] text-muted-foreground/90">
                        <li>
                          直接上传{" "}
                          <code className="bg-muted px-1 text-[9px]">.md</code>{" "}
                          文件，外链图片保持原样
                        </li>
                        <li>
                          上传带图片的{" "}
                          <code className="bg-muted px-1 text-[9px]">.zip</code>{" "}
                          文件，Markdown 里的相对路径只要能对应到 ZIP
                          中的文件即可
                        </li>
                        <li>多篇文章可以放在同一个 ZIP 中一起导入</li>
                        <li>兼容 Hugo、Hexo、Jekyll 的 frontmatter 字段</li>
                      </ul>
                      <div className="border-t border-border/10 pt-2 text-[9px] italic text-amber-500/80">
                        系统执行增量合并，检测到相同 slug 的文章会自动跳过。
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-sm text-muted-foreground">
                导入系统备份包或 Markdown 文件。
              </p>
            </div>
          </div>

          <div className="text-sm text-muted-foreground leading-relaxed">
            支持上传本系统导出的 `.zip` 备份包，或外部 Markdown
            文件进行内容迁移。增量合并，且能够兼容 Hugo / Hexo 等主流框架。
          </div>

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
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting || uploadMutation.isPending}
                className="h-11 w-full gap-3 rounded-none bg-foreground px-6 font-mono text-[10px] uppercase tracking-[0.2em] text-background transition-all hover:opacity-90 disabled:opacity-50"
              >
                {uploadMutation.isPending || isImporting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                {isImporting ? "正在导入" : "导入数据"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
