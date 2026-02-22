import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { forceCheckUpdateFn } from "@/features/version/version.api";
import { VERSION_KEYS } from "@/features/version/queries";
import { Button } from "@/components/ui/button";

export function VersionMaintenance() {
  const queryClient = useQueryClient();

  const checkUpdateMutation = useMutation({
    mutationFn: forceCheckUpdateFn,
    onSuccess: (result) => {
      queryClient.setQueryData(VERSION_KEYS.updateCheck, result);
      if (result.error) {
        toast.error("检查失败", {
          description: "无法连接到 GitHub API，请稍后重试。",
        });
        return;
      }
      if (result.data.hasUpdate) {
        toast.info("发现新版本", {
          description: `${result.data.latestVersion} 已发布! 点击查看详情。`,
          action: {
            label: "查看",
            onClick: () => window.open(result.data.releaseUrl, "_blank"),
          },
        });
      } else {
        toast.success("系统已是最新", {
          description: `当前版本 v${__APP_VERSION__} 为最新版本。`,
        });
      }
    },
  });

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-full">
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <h3 className="text-lg font-serif font-medium text-foreground tracking-tight">
            系统状态良好
          </h3>
        </div>
        <div className="flex flex-col gap-1 ml-11">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            当前运行版本:{" "}
            <span className="font-mono text-foreground font-bold tracking-tight">
              v{__APP_VERSION__}
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground/60 font-mono uppercase tracking-widest">
            Build: Production_Ready
          </p>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => checkUpdateMutation.mutate({})}
        disabled={checkUpdateMutation.isPending}
        className="h-10 px-6 font-mono text-[10px] uppercase tracking-[0.2em] rounded-none border-border/50 hover:bg-background transition-all group shrink-0"
      >
        <RefreshCw
          size={12}
          className={
            checkUpdateMutation.isPending
              ? "animate-spin mr-3"
              : "mr-3 group-hover:rotate-180 transition-transform duration-500"
          }
        />
        {checkUpdateMutation.isPending ? "检查中..." : "检查更新"}
      </Button>
    </div>
  );
}
