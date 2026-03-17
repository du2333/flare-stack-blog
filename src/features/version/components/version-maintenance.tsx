import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { forceCheckUpdateFn } from "@/features/version/api/version.api";
import { VERSION_KEYS } from "@/features/version/queries";
import { m } from "@/paraglide/messages";

export function VersionMaintenance() {
  const queryClient = useQueryClient();

  const checkUpdateMutation = useMutation({
    mutationFn: forceCheckUpdateFn,
    onSuccess: (result) => {
      queryClient.setQueryData(VERSION_KEYS.updateCheck, result);
      if (result.error) {
        toast.error(m.settings_maintenance_version_toast_fail(), {
          description: m.settings_maintenance_version_toast_fail_desc(),
        });
        return;
      }
      if (result.data.hasUpdate) {
        toast.info(m.settings_maintenance_version_toast_new(), {
          description: m.settings_maintenance_version_toast_new_desc({
            version: result.data.latestVersion,
          }),
          action: {
            label: m.settings_maintenance_version_action_view(),
            onClick: () => window.open(result.data.releaseUrl, "_blank"),
          },
        });
        return;
      }
      toast.success(m.settings_maintenance_version_toast_latest(), {
        description: m.settings_maintenance_version_toast_latest_desc({
          version: __APP_VERSION__,
        }),
      });
    },
  });

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="rounded-sm bg-emerald-500/10 p-3">
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-serif font-medium text-foreground tracking-tight">
              {m.settings_maintenance_version_title()}
            </h3>
            <p className="text-sm text-muted-foreground">
              {m.settings_maintenance_version_desc({
                version: __APP_VERSION__,
              })}
            </p>
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => checkUpdateMutation.mutate({})}
        disabled={checkUpdateMutation.isPending}
        className="h-10 shrink-0 rounded-none border-border/50 px-6 font-mono text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-background group"
      >
        <RefreshCw
          size={12}
          className={
            checkUpdateMutation.isPending
              ? "animate-spin mr-3"
              : "mr-3 group-hover:rotate-180 transition-transform duration-500"
          }
        />
        {checkUpdateMutation.isPending
          ? m.settings_maintenance_version_checking()
          : m.settings_maintenance_version_check_btn()}
      </Button>
    </div>
  );
}
