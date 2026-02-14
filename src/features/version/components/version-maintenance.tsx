import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { forceCheckUpdateFn } from "@/features/version/version.api";
import { VERSION_KEYS } from "@/features/version/queries";

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
    <div className="flex items-center justify-between py-4 border-b border-border/30 last:border-0 group">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">系统更新</h3>
        <p className="text-xs text-muted-foreground">
          当前版本: <span className="font-mono">{__APP_VERSION__}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => checkUpdateMutation.mutate({})}
        disabled={checkUpdateMutation.isPending}
        className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 uppercase tracking-widest"
      >
        {checkUpdateMutation.isPending ? (
          <RefreshCw size={12} className="animate-spin" />
        ) : (
          <RefreshCw size={12} />
        )}
        检查更新
      </button>
    </div>
  );
}
