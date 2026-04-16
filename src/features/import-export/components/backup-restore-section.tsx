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
import { getExportDownloadUrl } from "@/features/import-export/import-export.service";
import {
  useExportProgress,
  useImportProgress,
  useStartExport,
  useUploadForImport,
} from "@/features/import-export/queries/import-export.queries";
import { ms } from "@/lib/duration";
import { m } from "@/paraglide/messages";

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
        <span>{m.settings_restore_result_empty()}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-2.5">
      {hasSuccess && (
        <div className="border-l-2 border-emerald-500 pl-3.5 py-0.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            <CheckCircle2 size={13} strokeWidth={2.5} />
            <span>
              {m.settings_restore_result_success_count({
                count: succeeded.length,
              })}
            </span>
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
                {m.settings_restore_result_success_others({
                  count: succeeded.length - 3,
                })}
              </li>
            )}
          </ul>
        </div>
      )}

      {hasFailure && (
        <div className="border-l-2 border-red-500 pl-3.5 py-0.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-red-500 font-semibold text-xs uppercase tracking-wider">
            <XCircle size={13} strokeWidth={2.5} />
            <span>
              {m.settings_restore_result_failed_count({ count: failed.length })}
            </span>
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
                {m.settings_restore_result_failed_others({
                  count: failed.length - 3,
                })}
              </li>
            )}
          </ul>
        </div>
      )}

      {hasWarning && (
        <div className="border-l-2 border-amber-500 pl-3.5 py-0.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 font-semibold text-xs uppercase tracking-wider">
            <AlertTriangle size={13} strokeWidth={2.5} />
            <span>
              {m.settings_restore_result_warning_count({
                count: warnings.length,
              })}
            </span>
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
                {m.settings_restore_result_warning_others({
                  count: warnings.length - 3,
                })}
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
              {m.settings_restore_result_cache_hint()}
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
              case "WORKFLOW_CREATE_FAILED":
                toast.error(m.settings_maintenance_backup_toast_start_fail(), {
                  description:
                    m.settings_maintenance_backup_toast_start_fail_desc(),
                });
                return;
              default: {
                reason satisfies never;
                toast.error(m.settings_maintenance_backup_toast_start_fail(), {
                  description:
                    m.settings_maintenance_backup_toast_unknown_error(),
                });
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
          toast.error(m.settings_maintenance_backup_toast_failed(), {
            id: EXPORT_TOAST_ID,
            duration: ms("10s"),
            description: m.settings_maintenance_backup_toast_progress_error(),
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
      toast.success(m.settings_maintenance_backup_toast_success(), {
        id: EXPORT_TOAST_ID,
        duration: ms("10s"),
        description: m.settings_maintenance_backup_toast_success_desc({
          total,
        }),
        action: {
          label: m.settings_maintenance_backup_action_download(),
          onClick: () =>
            window.open(getExportDownloadUrl(currentTaskId), "_blank"),
        },
      });
      setExportTaskId(null);
    } else if (status === "failed") {
      toast.error(m.settings_maintenance_backup_toast_failed(), {
        id: EXPORT_TOAST_ID,
        duration: ms("10s"),
        description: m.settings_maintenance_backup_toast_failed_desc(),
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
              toast.error(m.settings_maintenance_restore_toast_upload_fail(), {
                description:
                  m.settings_maintenance_restore_toast_upload_no_files(),
              });
              return;
            case "UPLOAD_FAILED":
              toast.error(m.settings_maintenance_restore_toast_upload_fail(), {
                description:
                  m.settings_maintenance_restore_toast_upload_failed_desc(),
              });
              return;
            case "WORKFLOW_CREATE_FAILED":
              toast.error(m.settings_maintenance_restore_toast_upload_fail(), {
                description:
                  m.settings_maintenance_restore_toast_start_fail_desc(),
              });
              return;
            default: {
              reason satisfies never;
              toast.error(m.settings_maintenance_restore_toast_upload_fail(), {
                description:
                  m.settings_maintenance_restore_toast_unknown_error(),
              });
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
          toast.error(m.settings_maintenance_restore_toast_failed(), {
            id: IMPORT_TOAST_ID,
            duration: ms("10s"),
            description: m.settings_maintenance_restore_toast_progress_error(),
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

      (failed.length > 0 ? toast.warning : toast.success)(
        m.settings_maintenance_restore_toast_success(),
        {
          id: IMPORT_TOAST_ID,
          duration: ms("10s"),
          description: (
            <ImportToastResult
              succeeded={succeeded}
              failed={failed}
              warnings={warnings}
            />
          ),
        },
      );
      setImportTaskId(null);
    } else if (status === "failed") {
      toast.error(m.settings_maintenance_restore_toast_failed(), {
        id: IMPORT_TOAST_ID,
        duration: ms("10s"),
        description: m.settings_maintenance_restore_toast_failed_desc(),
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
                {m.settings_maintenance_backup_title()}
              </h4>
              <p className="text-sm text-muted-foreground">
                {m.settings_maintenance_backup_desc_short()}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {m.settings_maintenance_backup_desc_long()}
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
                {isExporting
                  ? m.settings_maintenance_backup_btn_loading()
                  : m.settings_maintenance_backup_btn()}
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
                  {m.settings_maintenance_restore_title()}
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
                        {m.settings_restore_tooltip_title()}
                      </p>
                      <ul className="list-disc space-y-2 pl-4 text-[10px] text-muted-foreground/90">
                        <li>{m.settings_restore_tooltip_md()}</li>
                        <li>{m.settings_restore_tooltip_zip()}</li>
                        <li>{m.settings_restore_tooltip_multiple()}</li>
                        <li>{m.settings_restore_tooltip_compat()}</li>
                      </ul>
                      <div className="border-t border-border/10 pt-2 text-[9px] italic text-amber-500/80">
                        {m.settings_restore_tooltip_note()}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-sm text-muted-foreground">
                {m.settings_maintenance_restore_desc_short()}
              </p>
            </div>
          </div>

          <div className="text-sm text-muted-foreground leading-relaxed">
            {m.settings_maintenance_restore_desc_long()}
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
                {isImporting
                  ? m.settings_maintenance_restore_btn_loading()
                  : m.settings_maintenance_restore_btn()}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
